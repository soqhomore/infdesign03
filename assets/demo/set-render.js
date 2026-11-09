export function syncAOProjection(aoPass,camera){
 const u=aoPass.ssaoMaterial.uniforms;u.cameraNear.value=camera.near;u.cameraFar.value=camera.far;u.cameraProjectionMatrix.value.copy(camera.projectionMatrix);u.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
 aoPass.depthRenderMaterial.uniforms.cameraNear.value=camera.near;aoPass.depthRenderMaterial.uniforms.cameraFar.value=camera.far;
}
// Borrow the interview's post-processing chain; do not allocate a second composer.
export function renderAlternateSet({composer,renderPass,aoPass},scene,camera){
 const visibilityOverride=aoPass._overrideVisibility;
 if(typeof visibilityOverride==='function')aoPass._overrideVisibility=function(){visibilityOverride.call(this);scene.traverse(object=>{if(object.userData.skipAO&&object.visible){object.visible=false;this._visibilityCache.push(object);}});};
 const original=[renderPass.scene,renderPass.camera,aoPass.scene,aoPass.camera];
 function configure(s,c){renderPass.scene=s;renderPass.camera=c;aoPass.scene=s;aoPass.camera=c;syncAOProjection(aoPass,c);}
 try{configure(scene,camera);composer.render();}finally{aoPass._restoreVisibility?.();aoPass._overrideVisibility=visibilityOverride;configure(original[2],original[3]);renderPass.scene=original[0];renderPass.camera=original[1];}
}
