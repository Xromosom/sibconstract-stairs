import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id), scene=new THREE.Scene();scene.background=new THREE.Color('#102030');
const camera=new THREE.PerspectiveCamera(42,1,.1,200);camera.position.set(5,4,8);const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,1.5,0);scene.add(new THREE.HemisphereLight(0xffffff,0x546474,2.3));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,8,6);scene.add(light);
const group=new THREE.Group();scene.add(group);
function oakTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;
 const ctx=c.getContext('2d');ctx.fillStyle='#c99b64';ctx.fillRect(0,0,c.width,c.height);
 // Grain runs along the width of the staircase (canvas horizontal axis).
 let seed=314159;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<1150;i++){
  const y=random()*c.height, amplitude=1+random()*7, phase=random()*6.283;
  ctx.beginPath();
  for(let x=0;x<=c.width;x+=8){
   const yy=y+Math.sin(x*.012+phase)*amplitude+Math.sin(x*.035+phase*2)*1.5;
   if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
  }
  ctx.strokeStyle=random()>.45?'rgba(91,48,20,0.11)':'rgba(255,232,185,0.16)';
  ctx.lineWidth=.4+random()*2.2;ctx.stroke();
 }
 for(let i=0;i<20;i++){
  const y=random()*c.height,phase=random()*6.28;
  ctx.beginPath();
  for(let x=0;x<=c.width;x+=6){
   const yy=y+Math.sin(x*.009+phase)*4+Math.sin(x*.024+phase)*2;
   if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
  }
  ctx.strokeStyle='rgba(107,63,32,0.22)';ctx.lineWidth=1+random()*2;ctx.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
const steel=new THREE.MeshStandardMaterial({color:0x34485c,metalness:.72,roughness:.35}),
wood=new THREE.MeshStandardMaterial({map:oakTexture(),color:0xffffff,roughness:.78,metalness:0}),
metalStep=new THREE.MeshStandardMaterial({color:0x8995a1,metalness:.7,roughness:.4});
// Один центральный косоур: замкнутая профильная труба 120 x 120 мм,
// наружное скругление углов R10. Толщина стенки 4 мм — только допущение
// для визуализации; при разработке КМ/КМД требуется уточнить.
function roundedRectangle(shape, half, radius, clockwise=false){
 const x=-half,y=-half,w=half*2,h=half*2,r=radius;
 if(!clockwise){shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y)}
 else {shape.moveTo(x+r,y);shape.quadraticCurveTo(x,y,x,y+r);shape.lineTo(x,y+h-r);shape.quadraticCurveTo(x,y+h,x+r,y+h);shape.lineTo(x+w-r,y+h);shape.quadraticCurveTo(x+w,y+h,x+w,y+h-r);shape.lineTo(x+w,y+r);shape.quadraticCurveTo(x+w,y,x+w-r,y);shape.lineTo(x+r,y)}
}
function centralKosour(a,b,verticalCutX=null){
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
 if(verticalCutX!==null){
  // Trim the upper end to the vertical landing face, not a sloped end cap.
  // Project the vertices of the upper end ring onto the plane X=verticalCutX.
  mesh.updateMatrix();
  const position=geometry.getAttribute('position');
  const endDepth=axis.length();
  for(let i=0;i<position.count;i++){
   const local=new THREE.Vector3().fromBufferAttribute(position,i);
   if(local.z>endDepth-.00001){
    const world=local.clone().applyMatrix4(mesh.matrix);
    world.x=verticalCutX;
    const clipped=world.applyMatrix4(mesh.matrix.clone().invert());
    position.setXYZ(i,clipped.x,clipped.y,clipped.z);
   }
  }
  position.needsUpdate=true;geometry.computeVertexNormals();
 }
 group.add(mesh);
}
// Rounded tread with 4 mm edge and corner radii.
// All twelve tread edges (top, bottom and four vertical corners)
// receive a true 4 mm radius, rather than just rounding the plan outline.
function roundedTread(x,y,depth,thickness,width,material){
 const radius=.004;
 const halfX=depth/2-radius, halfY=width/2-radius;
 const corner=.0001; // tiny core corner; bevel supplies the 4 mm roundover
 const shape=new THREE.Shape();
 shape.moveTo(-halfX+corner,-halfY);
 shape.lineTo(halfX-corner,-halfY);
 shape.quadraticCurveTo(halfX,-halfY,halfX,-halfY+corner);
 shape.lineTo(halfX,halfY-corner);
 shape.quadraticCurveTo(halfX,halfY,halfX-corner,halfY);
 shape.lineTo(-halfX+corner,halfY);
 shape.quadraticCurveTo(-halfX,halfY,-halfX,halfY-corner);
 shape.lineTo(-halfX,-halfY+corner);
 shape.quadraticCurveTo(-halfX,-halfY,-halfX+corner,-halfY);
 const coreThickness=thickness-2*radius;
 const geometry=new THREE.ExtrudeGeometry(shape,{
  depth:coreThickness,bevelEnabled:true,
  bevelThickness:radius,bevelSize:radius,
  bevelSegments:6,curveSegments:6,steps:1
 });
 geometry.translate(0,0,-coreThickness/2);
 geometry.rotateX(-Math.PI/2);
 geometry.computeVertexNormals();
 // Planar grain UVs for the top/bottom; continuous grain around rounded sides.
 // X = tread depth, Z = stair width. Texture's horizontal grain follows Z.
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
 const uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);
  const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
  if(ny>=nx&&ny>=nz){uv[2*i]=(pz+width/2)/width;uv[2*i+1]=(px+depth/2)/depth;}
  else if(nx>nz){uv[2*i]=(pz+width/2)/width;uv[2*i+1]=(py+thickness/2)/thickness;}
  else {uv[2*i]=(px+depth/2)/depth;uv[2*i+1]=(py+thickness/2)/thickness;}
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(x,y,0);group.add(mesh);
}
// Vertical 100x100 mm tube support, R10 outer corners; 4 mm assumed wall.
// Top mounting plate: 180x180x5 mm, four visible screw heads underneath.
function stepSupport(x,treadBottom,beamTop){
 const plateThickness=.005,plateLength=.18,plateWidth=.30,tubeSide=.100,tubeWall=.004;
 const plateBottom=treadBottom-plateThickness;
 const postBottom=beamTop-.035; // overlap with central stringer represents weld
 const postHeight=Math.max(.015,plateBottom-postBottom);
 const outer=new THREE.Shape();roundedRectangle(outer,tubeSide/2,.010);
 const hole=new THREE.Path();roundedRectangle(hole,tubeSide/2-tubeWall,.006,true);
 outer.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(outer,{depth:postHeight,bevelEnabled:false,curveSegments:8});
 g.rotateX(-Math.PI/2);
 const tube=new THREE.Mesh(g,steel);
 // Extrusion after rotation runs upward along Y.
 tube.position.set(x,postBottom,0);group.add(tube);
 box(x,plateBottom+plateThickness/2,0,plateLength,plateThickness,plateWidth,steel);
 const screwMat=new THREE.MeshStandardMaterial({color:0xb9bec3,metalness:.85,roughness:.3});
 for(const dx of [-.073,.073])for(const dz of [-.128,.128]){
  const head=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.002,12),screwMat);
  head.position.set(x+dx,plateBottom-.001, dz);group.add(head);
  const slot=new THREE.Mesh(new THREE.BoxGeometry(.006,.0005,.001),steel);
  slot.position.set(x+dx,plateBottom-.0021,dz);group.add(slot);
 }
}
function box(x,y,z,w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m)}
function read(){const h=Number($('height').value),r=Number($('run').value),w=Number($('width').value);if(![h,r,w].every(Number.isFinite)||h<1800||h>4500||r<1800||r>7000||w<600||w>1600)return null;const count=Math.max(2,Math.round(h/170)),rise=h/count,going=250,actualRun=(count-1)*going,angle=Math.atan((h-rise)/actualRun)*180/Math.PI;return {h,r,w,count,rise,going,angle,actualRun}}
function render(){const v=read();if(!v){$('stats').innerHTML='';$('warning').textContent='Проверьте размеры: высота 1800–4500 мм, длина 1800–7000 мм, ширина 600–1600 мм.';group.clear();return}const {h,r,w,count,rise,going,angle,actualRun}=v;const good=actualRun<=r&&rise>=150&&rise<=190&&going>=250&&going<=320&&angle>=25&&angle<=42;$('warning').textContent=actualRun>r?'Для ступеней глубиной 300 мм с перекрытием 50 мм требуется длина марша '+actualRun+' мм, что больше указанного доступного пространства '+r+' мм.':'Ступени 300×40 мм, горизонтальное перекрытие 50 мм. '+(good?'Геометрия предварительная; требуется проверка проектировщиком.':'Проверьте удобство уклона и соответствие применимым нормам.');$('stats').innerHTML=[['Подъёмов',count],['Высота подъёма',rise.toFixed(1)+' мм'],['Глубина ступени','300 мм'],['Перекрытие','50 мм'],['Уклон',angle.toFixed(1)+'°'],['Ширина',w+' мм'],['Длина марша',actualRun+' мм']].map(([a,b])=>'<div class="stat"><span class="muted">'+a+'</span><b>'+b+'</b></div>').join('');const unusedProjectSummary=`Заявка из онлайн-конструктора лестниц.\nТип: прямая маршевая.\nВысота между чистыми полами: ${h} мм.\nДоступная длина: ${r} мм.\nФактическая длина марша: ${actualRun} мм.\nШирина марша: ${w} мм.\nМатериал ступеней: ${$('treads').value==='wood'?'дерево':'металл'}.\nПредварительно: ${count} подъёмов по ${rise.toFixed(1)} мм; глубина ступени 300 мм, перекрытие 50 мм; уклон ${angle.toFixed(1)}°.\nКосоур: одна центральная профильная труба 120×120 мм, R10 (стенка 4 мм условно). Требуется проверка и профессиональный проект.`;
 group.clear();const H=h/1000,R=actualRun/1000,W=w/1000;
 const treadThickness=.040,beamHalf=.060;
 const beamRise=(count-1)*H/count;
 const slope=Math.atan2(beamRise,R),goingM=R/(count-1);
 const treadDepth=.300; // 300 mm tread, 250 mm going = 50 mm plan overlap
 // Each tread rises H/count, so the stringer must rise by exactly that
 // amount per going; using full H over R causes cumulative intersections.
 // At the FRONT of a tread the inclined stringer is highest.
 // Position its upper face 2 mm below the tread bottom there,
 // preventing intersection along the entire tread depth.
 const clearance=.008;
 const beamStartY=H/count-treadThickness/2-beamHalf/Math.cos(slope)-Math.tan(slope)*treadDepth-clearance;
 // Landing starts at the front edge of the final tread (50 mm beyond
 // the last tread's rear-based going line), aligned in plan.
 const landingFaceX=R/2+(treadDepth-goingM);
 const beamEndY=beamStartY+(landingFaceX+R/2)*Math.tan(slope);
 centralKosour([-R/2,beamStartY,0],[landingFaceX,beamEndY,0],landingFaceX);
 // Upper-floor slab: finished surface at H, front face at landingFaceX.
 // Sufficient illustrative depth to receive the stringer's vertical end.
 const landingThickness=Math.max(.40,H-beamEndY+.10);
 const landingLength=.75;
 box(landingFaceX+landingLength/2,H-landingThickness/2,0,landingLength,landingThickness,W+.30,
  new THREE.MeshStandardMaterial({color:0xa4adb6,roughness:.88}));
 for(let i=0;i<count-1;i++){
  const rearX=-R/2+i*goingM;
  const x=rearX+treadDepth/2,y=(i+1)*H/count;
  roundedTread(x,y,treadDepth,treadThickness,W,$('treads').value==='wood'?wood:metalStep);
  // Center the 100x100 support and its 300 mm plate under each tread.
  const supportX=x;
  const topOfBeamAtSupport=beamStartY+(supportX+R/2)*Math.tan(slope)+beamHalf/Math.cos(slope);
  stepSupport(supportX,y-treadThickness/2,topOfBeamAtSupport);
 }box(-R/2,-.06,0,.28,.12,W+.2,steel);controls.target.set(0,H/2,0);camera.position.set(R*.85+2,H*.65+2,W*2+3);controls.update()}
for(const id of ['height','run','width','treads'])$(id).addEventListener('input',render);function resize(){const r=$('view').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();render();function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
