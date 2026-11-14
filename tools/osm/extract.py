# Extrai do OpenStreetMap (Geofabrik, ODbL) um mapa compacto de Miami para o app GPS do jogo (offline).
import osmium, json, math, sys
from shapely import wkb
from shapely.geometry import LineString, Polygon, box, Point, MultiPolygon
from shapely.ops import polygonize, unary_union, transform
S, N, W, E = 25.70, 25.885, -80.32, -80.115
LAT0, LON0 = (S + N) / 2, (W + E) / 2; KX = math.cos(math.radians(LAT0)) * 111320; KY = 110540
def P(lon, lat): return ((lon - LON0) * KX, -(lat - LAT0) * KY)
BB = box(*P(W, N), *P(E, S))  # minx, miny(norte), maxx, maxy(sul)
inb = lambda lon, lat, m=0.01: S - m < lat < N + m and W - m < lon < E + m
RC = {'motorway': 0, 'trunk': 0, 'motorway_link': 1, 'trunk_link': 1, 'primary': 1, 'primary_link': 2, 'secondary': 2, 'secondary_link': 3, 'tertiary': 3, 'tertiary_link': 4, 'residential': 4, 'unclassified': 4, 'living_street': 4}
wkbf = osmium.geom.WKBFactory()
roads, coast, water, green, sand, places, names = [], [], [], [], [], [], {}
def proj(g): return transform(lambda x, y, z=None: P(x, y), g)
class H(osmium.SimpleHandler):
    def node(self, n):
        t = n.tags; pl = t.get('place')
        if pl in ('neighbourhood', 'suburb', 'quarter', 'city', 'town', 'village', 'island') and 'name' in t and inb(n.location.lon, n.location.lat, 0):
            x, y = P(n.location.lon, n.location.lat); places.append({'n': t['name'], 'k': pl, 'x': round(x), 'y': round(y), 'pop': t.get('population', '')})
    def way(self, w):
        t = w.tags; hw = t.get('highway'); nat = t.get('natural')
        if not (hw in RC or nat == 'coastline'): return
        try: pts = [(nd.location.lon, nd.location.lat) for nd in w.nodes]
        except osmium.InvalidLocationError: return
        if not any(inb(a, b) for a, b in pts) or len(pts) < 2: return
        g = LineString([P(a, b) for a, b in pts])
        if nat == 'coastline': coast.append(g); return
        g = g.intersection(BB.buffer(50))
        if g.is_empty: return
        c = RC[hw]; nm = t.get('name', '') if c <= 2 else ''
        for part in (getattr(g, 'geoms', None) or [g]):
            if part.geom_type != 'LineString': continue
            s = part.simplify(3 if c <= 2 else 5)
            roads.append((c, nm, [(round(x), round(y)) for x, y in s.coords]))
    def area(self, a):
        t = a.tags; kind = None
        if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('landuse') in ('basin', 'reservoir'): kind = 'w'
        elif t.get('leisure') in ('park', 'golf_course', 'nature_reserve') or t.get('landuse') in ('grass', 'recreation_ground', 'cemetery') or t.get('natural') in ('wood', 'scrub', 'wetland'): kind = 'g'
        elif t.get('natural') == 'beach': kind = 's'
        if not kind: return
        try: g = wkb.loads(wkbf.create_multipolygon(a), hex=True)
        except Exception: return
        mx = g.bounds
        if mx[2] < W or mx[0] > E or mx[3] < S or mx[1] > N: return
        g = proj(g).intersection(BB)
        if g.is_empty or g.area < (400 if kind != 's' else 150): return
        (water if kind == 'w' else green if kind == 'g' else sand).append(g.simplify(4))
f = sys.argv[1]
H().apply_file(f, locations=True, idx='flex_mem')
print('roads', len(roads), 'coast', len(coast), 'water', len(water), 'green', len(green), 'sand', len(sand), 'places', len(places), file=sys.stderr)
# mar a partir da linha de costa: terra fica à esquerda do sentido da via
lines = unary_union([c.intersection(BB.buffer(5)) for c in coast] + [BB.boundary])
polys = list(polygonize(lines)); segs = []
for c in coast:
    cs = list(c.coords)
    for i in range(len(cs) - 1): segs.append((cs[i], cs[i + 1]))
def is_water(poly):
    p = poly.representative_point(); best, bd = None, 1e18
    for (a, b) in segs:
        ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1; t = max(0, min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / L)); qx, qy = ax + t * dx, ay + t * dy; d = (p.x - qx) ** 2 + (p.y - qy) ** 2
        if d < bd: bd, best = d, (ax, ay, bx, by)
    ax, ay, bx, by = best; cr = (bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)
    return cr > 0  # y para baixo (sul): terra à esquerda dá cr<0, mar cr>0
sea = [pl for pl in polys if is_water(pl)]
print('sea polys', len(sea), 'of', len(polys), file=sys.stderr)
def ring(r, tol=6): return [[round(x), round(y)] for x, y in r.simplify(tol).coords]
def polyjs(g, tol=4):
    out = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon' or p.area < 200: continue
        out.append([ring(p.exterior, tol)] + [ring(h, tol) for h in p.interiors if h.length > 60])
    return out
seaU = unary_union(sea + water)
J = {'attr': '© colaboradores do OpenStreetMap · dados ODbL · openstreetmap.org/copyright', 'src': 'Geofabrik extrato da Flórida ' + sys.argv[2], 'bbox': [S, W, N, E], 'org': [LAT0, LON0], 'size': [round(BB.bounds[2] - BB.bounds[0]), round(BB.bounds[3] - BB.bounds[1])], 'min': [round(BB.bounds[0]), round(BB.bounds[1])],
     'water': polyjs(seaU, 6), 'green': polyjs(unary_union(green), 6), 'sand': polyjs(unary_union(sand), 4),
     'roads': [[c, nm, [v for xy in pts for v in xy]] for c, nm, pts in roads], 'places': places}
json.dump(J, open(sys.argv[3], 'w'), ensure_ascii=False, separators=(',', ':'))
import os; print('bytes', os.path.getsize(sys.argv[3]), file=sys.stderr)
