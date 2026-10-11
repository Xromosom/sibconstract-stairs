import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id), scene=new THREE.Scene();scene.background=new THREE.Color('#102030');
const camera=new THREE.PerspectiveCamera(42,1,.1,200);camera.position.set(5,4,8);const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,1.5,0);scene.add(new THREE.HemisphereLight(0xffffff,0x546474,2.3));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,8,6);scene.add(light);
const group=new THREE.Group();scene.add(group);const steel=new THREE.MeshStandardMaterial({color:0x34485c,metalness:.72,roughness:.35}),wood=new THREE.MeshStandardMaterial({color:0xb98750,roughness:.7}),metalStep=new THREE.MeshStandardMaterial({color:0x8995a1,metalness:.7,roughness:.4});
// Один центральный косоур: замкнутая профильная труба 120 x 120 мм,
// наружное скругление углов R10. Толщина стенки 4 мм — только допущение
// для визуализации; при разработке КМ/КМД требуется уточнить.
function roundedRectangle(shape, half, radius, clockwise=false){
 const x=-half,y=-half,w=half*2,h=half*2,r=radius;
 if(!clockwise){shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y)}
 else {shape.moveTo(x+r,y);shape.quadraticCurveTo(x,y,x,y+r);shape.lineTo(x,y+h-r);shape.quadraticCurveTo(x,y+h,x+r,y+h);shape.lineTo(x+w-r,y+h);shape.quadraticCurveTo(x+w,y+h,x+w,y+h-r);shape.lineTo(x+w,y+r);shape.quadraticCurveTo(x+w,y,x+w-r,y);shape.lineTo(x+r,y)}
}
function centralKosour(a,b){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(start);
 const outer=new THREE.Shape();roundedRectangle(outer,.060,.010);
 const inner=new THREE.Path();roundedRectangle(inner,.056,.006,true);outer.holes.push(inner);
 const geometry=new THREE.ExtrudeGeometry(outer,{depth:axis.length(),bevelEnabled:false,curveSegments:8,steps:1});
 // Extrusion is along local Z; rotate its axis to the stair slope.
 const mesh=new THREE.Mesh(geometry,steel);
 // Local X is across the staircase, local Y is the upper face normal,
 // local Z is the beam axis. This avoids the unwanted 45-degree roll.
 const direction=axis.normalize();
 const across=new THREE.Vector3(0,0,-1);
 const up=new THREE.Vector3().crossVectors(direction,across).normalize();
 const basis=new THREE.Matrix4().makeBasis(across,up,direction);
 mesh.position.copy(start);mesh.quaternion.setFromRotationMatrix(basis);
 group.add(mesh);
}
// Rounded tread with 4 mm edge and corner radii.
function roundedTread(x,y,depth,thickness,width,material){
 const radius=.004, shape=new THREE.Shape();
 const hx=depth/2-radius, hy=width/2-radius;
 shape.moveTo(-hx,-hy-radius);
 shape.lineTo(hx,-hy-radius);
 shape.quadraticCurveTo(hx+radius,-hy-radius,hx+radius,-hy);
 shape.lineTo(hx+radius,hy);
 shape.quadraticCurveTo(hx+radius,hy+radius,hx,hy+radius);
 shape.lineTo(-hx,hy+radius);
 shape.quadraticCurveTo(-hx-radius,hy+radius,-hx-radius,hy);
 shape.lineTo(-hx-radius,-hy);
 shape.quadraticCurveTo(-hx-radius,-hy-radius,-hx,-hy-radius);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness-2*radius,bevelEnabled:true,bevelThickness:radius,bevelSize:0,bevelSegments:4,curveSegments:6});
 geometry.translate(0,0,-(thickness-2*radius)/2);
 geometry.rotateX(-Math.PI/2);
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,0);group.add(mesh);
}
function box(x,y,z,w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m)}
function read(){const h=Number($('height').value),r=Number($('run').value),w=Number($('width').value);if(![h,r,w].every(Number.isFinite)||h<1800||h>4500||r<1800||r>7000||w<600||w>1600)return null;const count=Math.max(1,Math.round(h/170)),rise=h/count,going=r/(count-1),angle=Math.atan(h/r)*180/Math.PI;return {h,r,w,count,rise,going,angle}}
function render(){const v=read();if(!v){$('stats').innerHTML='';$('warning').textContent='Проверьте размеры: высота 1800–4500 мм, длина 1800–7000 мм, ширина 600–1600 мм.';group.clear();return}const {h,r,w,count,rise,going,angle}=v;const good=rise>=150&&rise<=190&&going>=250&&going<=320&&angle>=25&&angle<=42;$('warning').textContent=good?'Геометрия выглядит предварительно допустимой, но требует проверки по применимым нормам, месту установки и конструктивным ограничениям.':'Внимание: геометрия может быть неудобной или небезопасной. Измените длину или высоту и обратитесь к проектировщику.';$('stats').innerHTML=[['Подъёмов',count],['Высота подъёма',rise.toFixed(1)+' мм'],['Глубина проступи',going.toFixed(1)+' мм'],['Уклон',angle.toFixed(1)+'°'],['Ширина',w+' мм'],['Длина',r+' мм']].map(([a,b])=>'<div class="stat"><span class="muted">'+a+'</span><b>'+b+'</b></div>').join('');const unusedProjectSummary=`Заявка из онлайн-конструктора лестниц.\nТип: прямая маршевая.\nВысота между чистыми полами: ${h} мм.\nДоступная длина: ${r} мм.\nШирина марша: ${w} мм.\nМатериал ступеней: ${$('treads').value==='wood'?'дерево':'металл'}.\nПредварительно: ${count} подъёмов по ${rise.toFixed(1)} мм; глубина проступи ${going.toFixed(1)} мм; уклон ${angle.toFixed(1)}°.\nКосоур: одна центральная профильная труба 120×120 мм, R10 (стенка 4 мм условно). Требуется проверка и профессиональный проект.`;
 group.clear();const H=h/1000,R=r/1000,W=w/1000;
 const treadThickness=.045,beamHalf=.060;
 const beamRise=(count-1)*H/count;
 const slope=Math.atan2(beamRise,R),goingM=R/(count-1);
 const treadDepth=Math.min(.27,goingM*.96);
 // Each tread rises H/count, so the stringer must rise by exactly that
 // amount per going; using full H over R causes cumulative intersections.
 // At the FRONT of a tread the inclined stringer is highest.
 // Position its upper face 2 mm below the tread bottom there,
 // preventing intersection along the entire tread depth.
 const clearance=.008;
 const beamStartY=H/count-treadThickness/2-beamHalf/Math.cos(slope)-Math.tan(slope)*treadDepth-clearance;
 centralKosour([-R/2,beamStartY,0],[R/2,beamRise+beamStartY,0]);
 for(let i=0;i<count-1;i++){
  const rearX=-R/2+i*goingM;
  const x=rearX+treadDepth/2,y=(i+1)*H/count;
  roundedTread(x,y,treadDepth,treadThickness,W,$('treads').value==='wood'?wood:metalStep);
 }box(-R/2,-.06,0,.28,.12,W+.2,steel);box(R/2,H,0,.28,.12,W+.2,steel);controls.target.set(0,H/2,0);camera.position.set(R*.85+2,H*.65+2,W*2+3);controls.update()}
for(const id of ['height','run','width','treads'])$(id).addEventListener('input',render);function resize(){const r=$('view').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();render();function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
