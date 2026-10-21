// Deterministic, curved strands. All coordinates remain local to their 3D part.
export function strandPoints(root, normal, length, bend, segments=4) {
  const dot=normal[1];
  let tangent=[-normal[0]*dot,1-normal[1]*dot,-normal[2]*dot];
  const norm=Math.hypot(...tangent);
  tangent=norm<.001?[1,0,0]:tangent.map(v=>v/norm);
  return Array.from({length:segments+1},(_,i)=>{
    const t=i/segments;
    return root.map((v,j)=>v+normal[j]*length*t+tangent[j]*bend*t*t);
  });
}
