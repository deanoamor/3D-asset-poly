import * as THREE from 'three';
import { ASSETS, instantiateAsset, type AssetDef } from '../core/assets';
import { emptyDoc } from '../core/store';
import { buildExportScene } from '../engine/sceneBuild';

const cache = new Map<string, string>();

/** Pictures of the assets, lit like the Preview mode: warm backdrop, soft light and a real shadow on the floor. */
export function assetThumbnails(defs: AssetDef[] = ASSETS): Map<string, string> {
  const todo = defs.filter((d) => !cache.has(d.id));
  if (todo.length) {
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(560, 420, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      for (const def of todo) {
        const doc = emptyDoc(def.name);
        const { group, groups, parts } = instantiateAsset(def);
        doc.objects.push(group, ...groups, ...parts);
        const model = buildExportScene(doc, def.name);
        model.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe8ddcd);
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a58f, 1.6), model);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const radius = box.getSize(new THREE.Vector3()).length() / 2;
        const sun = new THREE.DirectionalLight(0xffffff, 2.2);
        sun.position.copy(center).add(new THREE.Vector3(0.5, 1.15, 0.6).normalize().multiplyScalar(radius * 3));
        sun.target.position.copy(center);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.02;
        sun.shadow.camera.left = sun.shadow.camera.bottom = -radius * 1.5;
        sun.shadow.camera.right = sun.shadow.camera.top = radius * 1.5;
        sun.shadow.camera.near = 0.1;
        sun.shadow.camera.far = radius * 8;
        scene.add(sun, sun.target);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 8, radius * 8).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.28 }));
        floor.receiveShadow = true;
        scene.add(floor);
        const hint = def.thumb ?? { dir: [0.9, 0.4, 1] as [number, number, number], zoom: 0.85 };
        const cam = new THREE.PerspectiveCamera(30, 560 / 420, 0.1, 400);
        const dist = (radius / Math.sin(THREE.MathUtils.degToRad(cam.fov) / 2)) * hint.zoom;
        // look slightly above the middle so the feet and the shadow stay in frame
        const look = center.clone();
        cam.position.copy(look).add(new THREE.Vector3(...hint.dir).normalize().multiplyScalar(dist));
        cam.lookAt(look);
        renderer.render(scene, cam);
        cache.set(def.id, renderer.domElement.toDataURL('image/png'));
        floor.geometry.dispose();
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
