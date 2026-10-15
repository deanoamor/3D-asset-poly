import * as THREE from 'three';
import { ASSETS, instantiateAsset, type AssetDef } from '../core/assets';
import { emptyDoc } from '../core/store';
import { buildExportScene } from '../engine/sceneBuild';

const cache = new Map<string, string>();

/** Small 3D pictures of the assets, drawn once with a temporary renderer. */
export function assetThumbnails(defs: AssetDef[] = ASSETS): Map<string, string> {
  const todo = defs.filter((d) => !cache.has(d.id));
  if (todo.length) {
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(480, 360, false);
      for (const def of todo) {
        const doc = emptyDoc(def.name);
        const { group, parts } = instantiateAsset(def);
        doc.objects.push(group, ...parts);
        const model = buildExportScene(doc, def.name);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe9ebe8);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa0a8, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 2.2);
        sun.position.set(5, 9, 4);
        scene.add(sun, model);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const radius = box.getSize(new THREE.Vector3()).length() / 2;
        const ground = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.25, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfe3de }));
        ground.position.y = -0.01;
        scene.add(ground);
        const cam = new THREE.PerspectiveCamera(32, 480 / 360, 0.1, 200);
        const dist = (radius / Math.sin(THREE.MathUtils.degToRad(cam.fov) / 2)) * 0.98;
        cam.position.copy(center).add(new THREE.Vector3(0.95, 0.62, 1.15).normalize().multiplyScalar(dist));
        cam.lookAt(center);
        renderer.render(scene, cam);
        cache.set(def.id, renderer.domElement.toDataURL('image/png'));
        ground.geometry.dispose();
      }
    } catch {
      /* no WebGL: cards fall back to a plain tile */
    } finally {
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  }
  return cache;
}
