// ======================================
// OBJECT MANAGER
// ======================================

export const Objects = {

  product:null,

  title:null,

  description:null,

  price:null,

  logo:null,

  overlay:null,

  extra:null,

  shape:null,

};

// ======================================
// SET
// ======================================

export function setObject(
  name,
  object
){

  Objects[name] = object;

}

// ======================================
// GET
// ======================================

export function getObject(name){

  return Objects[name];

}

// ======================================
// REMOVE
// ======================================

export function removeObject(
  canvas,
  name
){

  const obj =
  Objects[name];

  if(obj){

    canvas.remove(obj);

    Objects[name] = null;

  }

}

// ======================================
// VISIBILITY
// ======================================

export function toggleVisibility(
  name
){

  const obj =
  Objects[name];

  if(!obj) return;

  obj.visible =
  !obj.visible;

}

// ======================================
// LOCK
// ======================================

export function toggleLock(
  name
){

  const obj =
  Objects[name];

  if(!obj) return;

  obj.selectable =
  !obj.selectable;

}