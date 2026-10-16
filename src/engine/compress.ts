/**
 * Shrink a GLB for the web: positions, normals and colours are quantized, then every buffer is packed with meshopt
 * (EXT_meshopt_compression). Readers: three.js (MeshoptDecoder), Babylon.js, PlayCanvas, Blender 4+, model-viewer.
 * Not read by Unity, Godot or Unreal without plugins. Loaded on demand so the editor itself stays light.
 */
export async function compressGlb(data: ArrayBuffer): Promise<ArrayBuffer> {
  const [{ WebIO }, { EXTMeshoptCompression, KHRMeshQuantization }, { quantize, meshopt }, { MeshoptEncoder, MeshoptDecoder }] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
    import('meshoptimizer'),
  ]);
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new WebIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.readBinary(new Uint8Array(data));
  const skinned = doc.getRoot().listSkins().length > 0;
  // a skinned mesh keeps full-precision positions (the bind pose must match the bones exactly)
  await doc.transform(...(skinned ? [] : [quantize()]), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = await io.writeBinary(doc);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}
