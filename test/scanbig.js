// varre a cena: instâncias com escala/tamanho absurdo ou NaN
window.__scanBig = (lim = 30) => { const G = window.__G; const bad = []; let M = null, B = null, B2 = null; G.scene.updateMatrixWorld(true);
  G.scene.traverse(o => { if (!o.isMesh || !o.geometry) return; let vis = true, p = o; while (p) { if (!p.visible) { vis = false; break; } p = p.parent; } if (!vis) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const gb = g.boundingBox; if (!gb) return; if (!M) { M = new o.matrixWorld.constructor(); B = new gb.constructor(); B2 = new gb.constructor(); }
    const gs = gb.getSize(B2.min.clone()); const gmax = Math.max(gs.x, gs.y, gs.z);
    if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); const e = M.elements; if (e.some(v => !isFinite(v))) { bad.push({ n: o.name || g.type, i, nan: true }); continue; } M.premultiply(o.matrixWorld); B.copy(gb).applyMatrix4(M); const s = B.getSize(B2.max.clone()); const mx = Math.max(s.x, s.y, s.z); if (mx > lim && mx > gmax * 4) bad.push({ n: o.name || g.type, mat: o.material && o.material.type, cnt: o.count, i, size: [s.x, s.y, s.z].map(v => +v.toFixed(1)), at: [B.min.x, B.min.y, B.min.z].map(v => +v.toFixed(0)), g: +gmax.toFixed(2) }); } }
  });
  return bad.slice(0, 20).concat(bad.length > 20 ? [{ more: bad.length }] : []); };
