/*
 * BoxDemo, bullet.js (c) 2010 Peter Lueders <pl@jzone.de>
 * Javascript port of parts of JBullet and Vecmath.
 *
 * Vecmath: Copyright (C) 1997,1998,1999
 * Kenji Hiranabe, Eiwa System Management, Inc.
 * Java port of Bullet (c) 2008 Martin Dvorak <jezek2@advel.cz>
 * Bullet Continuous Collision Detection and Physics Library
 * Copyright (c) 2003-2008 Erwin Coumans  http://www.bulletphysics.com/
 *
 * This software is provided 'as-is', without any express or implied warranty.
 * In no event will the authors be held liable for any damages arising from
 * the use of this software.
 * 
 * Permission is granted to anyone to use this software for any purpose, 
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 
 * 1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 *    misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */
var Vecmath={};
(function(Vecmath) {
  Vecmath.Vec3=function() {
    if (arguments.length==3) this.set3(arguments[0],arguments[1],arguments[2]);
  }
  Vecmath.Vec3.prototype.x=0;
  Vecmath.Vec3.prototype.y=0;
  Vecmath.Vec3.prototype.z=0;
  Vecmath.Vec3.prototype.set3=function(x,y,z) {
    this.x=x;this.y=y;this.z=z;
  }
  Vecmath.Vec3.prototype.set1=function(v) {
    //if (v==null) throw arguments.callee.caller;
    ////throw Bullet.stacktrace();//throw "Vec3.set1:"+arguments.callee.caller;
    this.x=v.x;this.y=v.y;this.z=v.z;
  }
  Vecmath.Vec3.prototype.sub1=function(v) {
    this.x-=v.x;this.y-=v.y;this.z-=v.z;
  }
  Vecmath.Vec3.prototype.sub2=function(t1,t2) {
    this.x = t1.x - t2.x;
    this.	y = t1.y - t2.y;
    this.	z = t1.z - t2.z;
  }
  Vecmath.Vec3.prototype.cross=function(v1,v2) {
    this.set3(
      v1.y*v2.z - v1.z*v2.y,
      v1.z*v2.x - v1.x*v2.z,
      v1.x*v2.y - v1.y*v2.x
    );
  }
  Vecmath.Vec3.prototype.normalize=function() {
    var d=this.length();
    this.x/=d;
    this.y/=d;
    this.z/=d;
  }
  Vecmath.Vec3.prototype.lengthSquared=function() {
    return this.x*this.x+this.y*this.y+this.z*this.z;
  }
  Vecmath.Vec3.prototype.length=function() {
    return Math.sqrt(this.lengthSquared());
  }
  Vecmath.Vec3.prototype.scale1=function(s) {
    this.x*=s;this.y*=s;this.z*=s;
  }
  Vecmath.Vec3.prototype.scale2=function(s,v) {
    this.x=s*v.x;this.y=s*v.y;this.z=s*v.z;
  }
  Vecmath.Vec3.prototype.scaleAdd=function(s,t1,t2) {
    this.x = s*t1.x + t2.x;
    this.	y = s*t1.y + t2.y;
    this.	z = s*t1.z + t2.z;
  }
  Vecmath.Vec3.prototype.dot=function(v1) {
    return this.x*v1.x + this.y*v1.y + this.z*v1.z;
  }
  Vecmath.Vec3.prototype.normalize1=function(v1) {
    this.set1(v1);
    this.normalize();
  }
  Vecmath.Vec3.prototype.add1=function(v) {
    this.x+=v.x;this.y+=v.y;this.z+=v.z;
  }
  Vecmath.Vec3.prototype.add2=function(t1,t2) {
    this.x = t1.x + t2.x;
    this.	y = t1.y + t2.y;
    this.	z = t1.z + t2.z;
  }
  Vecmath.Vec3.prototype.negate0=function() {
    this.x=-this.x;this.y=-this.y;this.z=-this.z;
  }
  Vecmath.Vec3.prototype.negate1=function(t1) {
    this.x=-t1.x;this.y=-t1.y;this.z=-t1.z;
  }
  Vecmath.Vec3.prototype.toString=function() {
    return "V3["+this.x+","+this.y+","+this.z+"]";
  }
  Vecmath.Vec3.prototype.equals=function(v) {
    return (v!=null)&&(this.x==v.x)&&(this.y==v.y)&&(this.z==v.z);
  }
  Vecmath.Vec4=function() {
    if (arguments.length==1) this.set1(arguments[0]);
    if (arguments.length==4) this.set4(arguments[0],arguments[1],arguments[2],arguments[3]);
  }
  Vecmath.Vec4.prototype.x=0;
  Vecmath.Vec4.prototype.y=0;
  Vecmath.Vec4.prototype.z=0;
  Vecmath.Vec4.prototype.w=0;
  Vecmath.Vec4.prototype.set4=function(x,y,z,w) {
    this.x=x;this.y=y;this.z=z;this.w=w;
  }
  Vecmath.Vec4.prototype.set1=function(v) {
    this.x=v.x;this.y=v.y;this.z=v.z;this.w=v.w;
  }
  Vecmath.Vec4.prototype.absolute=function() {
    if (this.x < 0.0) this.x = -this.x;
    	if (this.y < 0.0) this.y = -this.y;
    	if (this.z < 0.0) this.z = -this.z;
    	if (this.w < 0.0) this.w = -this.w;
  }
  Vecmath.Vec4.prototype.toString=function() {
    return "Vec4["+this.x+","+this.y+","+this.z+","+this.w+"]";
  }
  Vecmath.Quat4=function() {
    if (arguments.length==1) this.set1(arguments[0]);
    if (arguments.length==4) this.set4(arguments[0],arguments[1],arguments[2],arguments[3]);
  }
  Vecmath.Quat4.prototype=new Vecmath.Vec4();
  Vecmath.Quat4.prototype.mul=function(q1,q2) {
    this.	set4(
        	    q1.x*q2.w + q1.w*q2.x + q1.y*q2.z - q1.z*q2.y,
        	    q1.y*q2.w + q1.w*q2.y + q1.z*q2.x - q1.x*q2.z,
        	    q1.z*q2.w + q1.w*q2.z + q1.x*q2.y - q1.y*q2.x,
        	    q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z
        	    );
  }
  Vecmath.Quat4.prototype.norm=function() {
    return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w;
  }
  Vecmath.Quat4.prototype.normalize=function() {
    var n=Math.sqrt(this.norm());
    this.	x /= n;
    this.	y /= n;
    this.	z /= n;
    this.	w /= n;
  }
  Vecmath.Quat4.prototype.toString=function() {
    return "Quat4";
  }
  Vecmath.Mat3=function() {}
  Vecmath.Mat3.prototype.m00=0;
  Vecmath.Mat3.prototype.m01=0;
  Vecmath.Mat3.prototype.m02=0;
  Vecmath.Mat3.prototype.m10=0;
  Vecmath.Mat3.prototype.m11=0;
  Vecmath.Mat3.prototype.m12=0;
  Vecmath.Mat3.prototype.m20=0;
  Vecmath.Mat3.prototype.m21=0;
  Vecmath.Mat3.prototype.m22=0;
  Vecmath.Mat3.prototype.set9=function(m00,m01,m02,m10,m11,m12,m20,m21,m22) {
    	this.m00 = m00; this.m01 = m01; this.m02 = m02;
    	this.m10 = m10; this.m11 = m11; this.m12 = m12;
    	this.m20 = m20; this.m21 = m21; this.m22 = m22;
  }
  Vecmath.Mat3.prototype.set1=function(m1) {
    	this.m00 = m1.m00; this.m01 = m1.m01; this.m02 = m1.m02;
    	this.m10 = m1.m10; this.m11 = m1.m11; this.m12 = m1.m12;
    	this.m20 = m1.m20; this.m21 = m1.m21; this.m22 = m1.m22;
  }
  Vecmath.Mat3.prototype.seta=function(m) {
    	this.m00 = m[0]; this.m01 = m[1]; this.m02 = m[2];
    	this.m10 = m[3]; this.m11 = m[4]; this.m12 = m[5];
    	this.m20 = m[6]; this.m21 = m[7]; this.m22 = m[8];
  }
  Vecmath.Mat3.prototype.transform1=function(t) {
    this.transform2(t,t);
  }
  Vecmath.Mat3.prototype.transform2=function(t,result) {
    result.set3(
      this.m00*t.x + this.m01*t.y + this.m02*t.z,
      this.m10*t.x + this.m11*t.y + this.m12*t.z,
      this.m20*t.x + this.m21*t.y + this.m22*t.z
    );
  }
  Vecmath.Mat3.prototype.mul1=function(m1) {
    this.mul2(this,m1);
  }
  Vecmath.Mat3.prototype.mul2=function(m1,m2) {
    this.set9(
        	    m1.m00*m2.m00 + m1.m01*m2.m10 + m1.m02*m2.m20,
        	    m1.m00*m2.m01 + m1.m01*m2.m11 + m1.m02*m2.m21,
        	    m1.m00*m2.m02 + m1.m01*m2.m12 + m1.m02*m2.m22,
        
        	    m1.m10*m2.m00 + m1.m11*m2.m10 + m1.m12*m2.m20,
        	    m1.m10*m2.m01 + m1.m11*m2.m11 + m1.m12*m2.m21,
        	    m1.m10*m2.m02 + m1.m11*m2.m12 + m1.m12*m2.m22,
        
        	    m1.m20*m2.m00 + m1.m21*m2.m10 + m1.m22*m2.m20,
        	    m1.m20*m2.m01 + m1.m21*m2.m11 + m1.m22*m2.m21,
        	    m1.m20*m2.m02 + m1.m21*m2.m12 + m1.m22*m2.m22
      );
  }
  Vecmath.Mat3.prototype.transpose=function() {
    var tmp = this.m01;
    this.m01 = this.m10;
    this.m10 = tmp;
    
    	tmp = this.m02;
    this.	m02 = this.m20;
    this.m20 = tmp;
        
    	tmp = this.m12;
    this.	m12 = this.m21;
    this.	m21 = tmp;
  }
  Vecmath.Mat3.prototype.getRow=function(row,v) {
    	if (row == 0) {
        	    v.x = this.m00;
        	    v.y = this.m01;
        	    v.z = this.m02;
    	} else if (row == 1) {
        	    v.x = this.m10;
        	    v.y = this.m11;
        	    v.z = this.m12;
    	} else if (row == 2) {
        	    v.x = this.m20;
        	    v.y = this.m21;
        	    v.z = this.m22;
    	} else {
        	    alert("row must be 0 to 2 and is " + row);
    	}
  }
  Vecmath.Mat3.prototype.setRow=function(row,x,y,z) {
    if (row == 0) {
    	    this.m00 = x;
    	    this.m01 = y;
    	    this.m02 = z;
    	} else if (row == 1) {
    	    this.m10 = x;
    	    this.m11 = y;
    	    this.m12 = z;
    	} else if (row == 2) {
    	    this.m20 = x;
    	    this.m21 = y;
    	    this.m22 = z;
    	} else {
    	    alert("row must be 0 to 2 and is " + row);
    	}
  }
  Vecmath.Mat3.prototype.getElement=function(row,column) {
    if (row == 0)
    	    if (column == 0)
    		return this.m00;
    	    else if (column == 1)
    		return this.m01;
    	    else if (column == 2)
    		return this.m02;
    	    else
    	alert("column must be 0 to 2 and is " + column);
    	else if (row == 1)
    	    if (column == 0)
    		return this.m10;
    	    else if (column == 1)
    		return this.m11;
    	    else if (column == 2)
    		return this.m12;
    	    else
    		alert("column must be 0 to 2 and is " + column);
    
    	else if (row == 2)
    	    if (column == 0)
    		return this.m20;
    	    else if (column == 1)
    		return this.m21;
    	    else if (column == 2)
    		return this.m22;
    	    else
    		alert("column must be 0 to 2 and is " + column);
    	else
    		alert("row must be 0 to 2 and is " + row);
  }
  Vecmath.Mat3.prototype.setIdentity=function() {
    this.m00 = 1.0; this.m01 = 0.0; this.m02 = 0.0;
    this.m10 = 0.0; this.m11 = 1.0; this.m12 = 0.0;
    this.m20 = 0.0; this.m21 = 0.0; this.m22 = 1.0;
  }
  Vecmath.Mat3.prototype.toString=function() {
    return "M3("+this.m00+","+this.m01+","+this.m02+"..)";
  }
  Vecmath.Mat4=function() {}
  Vecmath.Mat4.prototype.m00=0;
  Vecmath.Mat4.prototype.m01=0;
  Vecmath.Mat4.prototype.m02=0;
  Vecmath.Mat4.prototype.m03=0;
  Vecmath.Mat4.prototype.m10=0;
  Vecmath.Mat4.prototype.m11=0;
  Vecmath.Mat4.prototype.m12=0;
  Vecmath.Mat4.prototype.m13=0;
  Vecmath.Mat4.prototype.m20=0;
  Vecmath.Mat4.prototype.m21=0;
  Vecmath.Mat4.prototype.m22=0;
  Vecmath.Mat4.prototype.m23=0;
  Vecmath.Mat4.prototype.m30=0;
  Vecmath.Mat4.prototype.m31=0;
  Vecmath.Mat4.prototype.m32=0;
  Vecmath.Mat4.prototype.m33=0;
  Vecmath.Mat4.prototype.rotX=function(angle) {
    var c=Math.cos(angle);
    var s=Math.sin(angle);
    this.m00 = 1.0; this.m01 = 0.0; this.m02 = 0.0; this.m03 = 0.0;
    this.m10 = 0.0; this.m11 = c;   this.m12 = -s;  this.m13 = 0.0;
    this.m20 = 0.0; this.m21 = s;   this.m22 = c;   this.m23 = 0.0;
    this.m30 = 0.0; this.m31 = 0.0; this.m32 = 0.0; this.m33 = 1.0; 
  }
  Vecmath.Mat4.prototype.rotZ=function(angle) {
    var c=Math.cos(angle);
    var s=Math.sin(angle);
    this.m00 = c;   this.m01 = -s;  this.m02 = 0.0; this.m03 = 0.0;
    this.m10 = s;   this.m11 = c;   this.m12 = 0.0; this.m13 = 0.0;
    this.m20 = 0.0; this.m21 = 0.0; this.m22 = 1.0; this.m23 = 0.0;
    this.m30 = 0.0; this.m31 = 0.0; this.m32 = 0.0; this.m33 = 1.0; 
  }
  Vecmath.Mat4.prototype.transform2=function(vec,vecOut) {
    vecOut.set4(
      this.m00*vec.x + this.m01*vec.y + this.m02*vec.z + this.m03*vec.w,
      this.m10*vec.x + this.m11*vec.y + this.m12*vec.z + this.m13*vec.w,
      this.m20*vec.x + this.m21*vec.y + this.m22*vec.z + this.m23*vec.w,
      this.m30*vec.x + this.m31*vec.y + this.m32*vec.z + this.m33*vec.w
    ); 
  }
  Vecmath.Mat4.prototype.transform1=function(vec) {
    this.transform2(vec,vec);
  }
  Vecmath.Mat4.prototype.set16=function(m00,m01,m02,m03,m10,m11,m12,m13,m20,m21,m22,m23,m30,m31,m32,m33) {
    this.m00 = m00; this.m01 = m01; this.m02 = m02; this.m03 = m03;
    this.m10 = m10; this.m11 = m11; this.m12 = m12; this.m13 = m13;
    this.m20 = m20; this.m21 = m21; this.m22 = m22; this.m23 = m23;
    this.m30 = m30; this.m31 = m31; this.m32 = m32; this.m33 = m33;
  }
  Vecmath.Mat4.prototype.set1=function(m1) {
    this.m00 = m1.m00; this.m01 = m1.m01; this.m02 = m1.m02; this.m03 = 0.0;
    this.	m10 = m1.m10; this.m11 = m1.m11; this.m12 = m1.m12; this.m13 = 0.0;
    this.	m20 = m1.m20; this.m21 = m1.m21; this.m22 = m1.m22; this.m23 = 0.0;
    this.	m30 =    0.0; this.m31 =    0.0; this.m32 =    0.0; this.m33 = 1.0;
  }
  Vecmath.Mat4.prototype.mul2=function(m1,m2) {
    this.set16(
      m1.m00*m2.m00 + m1.m01*m2.m10 + m1.m02*m2.m20 + m1.m03*m2.m30,
      m1.m00*m2.m01 + m1.m01*m2.m11 + m1.m02*m2.m21 + m1.m03*m2.m31,
      m1.m00*m2.m02 + m1.m01*m2.m12 + m1.m02*m2.m22 + m1.m03*m2.m32,
      m1.m00*m2.m03 + m1.m01*m2.m13 + m1.m02*m2.m23 + m1.m03*m2.m33,
      m1.m10*m2.m00 + m1.m11*m2.m10 + m1.m12*m2.m20 + m1.m13*m2.m30,
      m1.m10*m2.m01 + m1.m11*m2.m11 + m1.m12*m2.m21 + m1.m13*m2.m31,
      m1.m10*m2.m02 + m1.m11*m2.m12 + m1.m12*m2.m22 + m1.m13*m2.m32,
      m1.m10*m2.m03 + m1.m11*m2.m13 + m1.m12*m2.m23 + m1.m13*m2.m33,
      m1.m20*m2.m00 + m1.m21*m2.m10 + m1.m22*m2.m20 + m1.m23*m2.m30,
      m1.m20*m2.m01 + m1.m21*m2.m11 + m1.m22*m2.m21 + m1.m23*m2.m31,
      m1.m20*m2.m02 + m1.m21*m2.m12 + m1.m22*m2.m22 + m1.m23*m2.m32,
      m1.m20*m2.m03 + m1.m21*m2.m13 + m1.m22*m2.m23 + m1.m23*m2.m33,
      m1.m30*m2.m00 + m1.m31*m2.m10 + m1.m32*m2.m20 + m1.m33*m2.m30,
      m1.m30*m2.m01 + m1.m31*m2.m11 + m1.m32*m2.m21 + m1.m33*m2.m31,
      m1.m30*m2.m02 + m1.m31*m2.m12 + m1.m32*m2.m22 + m1.m33*m2.m32,
      m1.m30*m2.m03 + m1.m31*m2.m13 + m1.m32*m2.m23 + m1.m33*m2.m33
    );
  }
  Vecmath.Mat4.prototype.mul1=function(m1) {
    this.mul2(this,m1);
  }
  Vecmath.Mat4.prototype.getRotationScale=function(m1) {
    	m1.m00 = this.m00; m1.m01 = this.m01; m1.m02 = this.m02;
    	m1.m10 = this.m10; m1.m11 = this.m11; m1.m12 = this.m12;
    	m1.m20 = this.m20; m1.m21 = this.m21; m1.m22 = this.m22;
  }
  Vecmath.Mat4.prototype.toString=function() {
    return "M4("+this.m00+","+this.m01+","+this.m02+","+this.m03+"..)";
  }
  
}
)(Vecmath);
 
var Bullet={};
(function(Bullet) {
  Bullet.dbg=false;
  Bullet.objC=0;
  Bullet.log=function(s) {
    //document.getElementById("info").innerHTML+="<br>"+s;
  }
  Bullet.out=function(s) {
    document.getElementById("info0").innerHTML="Out: "+s;
  }
  Bullet.a2s=function(a,len) {
    if (len>a.length) len=a.len;
    var s="";
    for (var h=0;h<len;h++) s+=(h==0?"[":",")+a[h];
    s+="]";
    return s;
  }
  Bullet.arrayFill=function(a,v) {
    for (var i=a.length-1;i>=0;i--) a[i]=v;
  }
  Bullet.arrayCreate=function(ca,i,value) {
    if (i==null) i=0;
    var a=new Array(ca[i]);
    for (var h=a.length-1;h>=0;h--) {
      a[h]=i<ca.length-1?Bullet.arrayCreate(ca,i+1):value;
    }
    return a;
  }
  Bullet.stacktrace=function() {
    function st2(f) {
      return !f ? [] : 
          st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + f.arguments + ')']);
    }
    return st2(arguments.callee.caller);
  }
  Bullet.ObjectStackList=function(createF) {
    this.stack=new Array(512);
    this.list=new Array();
    this.createF=createF;
    this.returnObj=createF();
  }
  Bullet.ObjectStackList.prototype.stackCount=0;
  Bullet.ObjectStackList.prototype.pos=0;
  Bullet.ObjectStackList.prototype.push=function() {
    this.stack[this.stackCount++]=this.pos;
  }
  Bullet.ObjectStackList.prototype.pop=function() {
    this.pos=this.stack[--this.stackCount];
  }
  Bullet.ObjectStackList.prototype.get=function() {
    if (this.pos==this.list.length) this.list.push(this.createF());//this.expand();
    return this.list[this.pos++];
  }
  Bullet.ObjectArrayList=function() {
    this.array=new Array(16);
  }
  Bullet.ObjectArrayList.prototype.size=0
  Bullet.ObjectArrayList.prototype.add=function(value) {
    if (this.size==this.array.length) this.array.push(value);
    this.array[this.size++]=value;
  }
  Bullet.ObjectArrayList.prototype.remove=function(index) {
    this.array.splice(index,1);
    this.size--;
  }
  Bullet.ObjectArrayList.prototype.get=function(index) {
    return this.array[index];
  }
  Bullet.ObjectArrayList.prototype.set=function(index,value) {
    var old=this.array[index];
    this.array[index]=value;
    return old;
  }
  Bullet.ObjectArrayList.prototype.sizef=function() {
    return this.size;
  }
  Bullet.ObjectArrayList.prototype.capacity=function() {
    return this.array.length;
  }
  Bullet.ObjectArrayList.prototype.clear=function() {
    this.size=0;
  }
  Bullet.ObjectArrayList.prototype.indexOf=function(o) {
    		for (var i=0; i<size; i++) {
       			if (o == null? array[i] == null : o==array[i]) {
         				return i;
       			}
    		}
    		return -1;
  }
  Bullet.ObjectArrayList.prototype.toString=function() {
    return "ObjectArrayList["+Bullet.a2s(this.array,16)+"]";
  }
  Bullet.ObjectPool=function(createF) {
    this.list=new Array();
    this.createF=createF;
  }
  Bullet.ObjectPool.prototype.get=function() {
    		if (this.list.length > 0) {
        			return this.list.pop();//list.remove(list.size() - 1);
    		} 		else {
      			return this.createF();//new Object();//create();
    		}
  }
  Bullet.ObjectPool.prototype.release=function(obj) {
    this.list.push(obj);
  }
  Bullet.ArrayPool=function() {
    //...
  }
  Bullet.ArrayPool.prototype.ars={};
  Bullet.ArrayPool.prototype.getFixed=function(length) {
    var a=this.ars["a"+length];
    if (a!=null) 
      if (a.length>0) 
        return a.pop();
    return new Array(length);
  }
  Bullet.ArrayPool.prototype.release=function(ah) {
    var a=this.ars["a"+ah.length];
    if (a==null) { a=new Array();this.ars["a"+ah.length]=a; }
    a.push(ah);
  }
  Bullet.BroadphaseNativeType={
    BOX_SHAPE_PROXYTYPE:0,
    	TRIANGLE_SHAPE_PROXYTYPE:1,
    	TETRAHEDRAL_SHAPE_PROXYTYPE:2,
    	CONVEX_TRIANGLEMESH_SHAPE_PROXYTYPE:3,
    	CONVEX_HULL_SHAPE_PROXYTYPE:4,
  	
    	// implicit convex shapes:
    	IMPLICIT_CONVEX_SHAPES_START_HERE:5,
    	SPHERE_SHAPE_PROXYTYPE:6,
    	MULTI_SPHERE_SHAPE_PROXYTYPE:7,
    	CAPSULE_SHAPE_PROXYTYPE:8,
    	CONE_SHAPE_PROXYTYPE:9,
    	CONVEX_SHAPE_PROXYTYPE:10,
    	CYLINDER_SHAPE_PROXYTYPE:11,
  	  UNIFORM_SCALING_SHAPE_PROXYTYPE:12,
  	  MINKOWSKI_SUM_SHAPE_PROXYTYPE:13,
  	  MINKOWSKI_DIFFERENCE_SHAPE_PROXYTYPE:14,
    	// concave shapes:
    	CONCAVE_SHAPES_START_HERE:15,
    	// keep all the convex shapetype below here, for the check IsConvexShape in broadphase proxy!
    	TRIANGLE_MESH_SHAPE_PROXYTYPE:16,
    	SCALED_TRIANGLE_MESH_SHAPE_PROXYTYPE:17,
    	// used for demo integration FAST/Swift collision library and Bullet:
    	FAST_CONCAVE_MESH_PROXYTYPE:18,
    	// terrain:
    TERRAIN_SHAPE_PROXYTYPE:19,
    // used for GIMPACT Trimesh integration:
    GIMPACT_SHAPE_PROXYTYPE:20,
    // multimaterial mesh:
    MULTIMATERIAL_TRIANGLE_MESH_PROXYTYPE:21,
    	EMPTY_SHAPE_PROXYTYPE:22,
    STATIC_PLANE_PROXYTYPE:23,
    CONCAVE_SHAPES_END_HERE:24,
    COMPOUND_SHAPE_PROXYTYPE:25,
    SOFTBODY_SHAPE_PROXYTYPE:26,
    MAX_BROADPHASE_COLLISION_TYPES:27};
  Bullet.BroadphaseNativeType.isPolyhedral=function(v) {
    return (v<this.IMPLICIT_CONVEX_SHAPES_START_HERE);
  }
  Bullet.BroadphaseNativeType.isConvex=function(v) {
    return (v<this.CONCAVE_SHAPES_START_HERE);
  }
  Bullet.BroadphaseNativeType.isConcave=function(v) {
    return (v>this.CONCAVE_SHAPES_START_HERE)&&(v<this.CONCAVE_SHAPES_END_HERE);
  }
  Bullet.BroadphaseNativeType.isCompound=function(v) {
    return (v==this.COMPOUND_SHAPE_PROXYTYPE);
  }
  Bullet.BroadphaseNativeType.isInfinite=function(v) {
    return (v==this.STATIC_PLANE_PROXYTYPE);
  }
  Bullet.BulletGlobals={
    CONVEX_DISTANCE_MARGIN:0.04,
    FLT_EPSILON:1.19209290e-07,
    SIMD_EPSILON:1.19209290e-07,
    SIMD_2_PI:6.283185307179586232,
    SIMD_PI:6.283185307179586232*0.5,
    SIMD_HALF_PI:6.283185307179586232*0.25,
    SIMD_RADS_PER_DEG:6.283185307179586232/360,
    SIMD_DEGS_PER_RAD:360/6.283185307179586232,
    SIMD_INFINITY:Number.MAX_VALUE,
    contactBreakingThreshold:0.02,
    deactivationTime:2,
    disableDeactivation:false};
  Bullet.MiscUtil={};
  Bullet.MiscUtil.resizec=function(list,size,value) {
    //list=objectarraylist
    while (list.sizef()<size) list.add(value);
    while (list.sizef()>size) list.remove(list.sizef()-1);
  }
  Bullet.MiscUtil.resizea=function(list,size,valueF) {
    //list=array
    while (list.length<size) list.push(valueF());
    while (list.length>size) list.pop();//list.remove(list.size()-1);
  }
  Bullet.MiscUtil.GEN_clamped=function(a,lb,ub) {
    		return a < lb ? lb : (ub < a ? ub : a);
  }
  Bullet.MiscUtil.downHeap=function(pArr,k,n,compF) {
    //     PRE: a[k+1..N] is a heap 
    //     POST:  a[k..N]  is a heap 
    var temp = pArr[k - 1];
    //    	k has child(s) 
    		while (k <= Math.floor(n / 2)) {//pl-java n/2
      var child = 2 * k;
      			if ((child < n) && compF(pArr[child - 1], pArr[child]) < 0) 
        				child++;
      //    pick larger child 
      			if (compF(temp, pArr[child - 1]) < 0) {
        //    move child up 
        				pArr[k - 1]=pArr[child - 1];
        				k = child;
      			} 			else {
        				break;
      			}
    		}
    		pArr.set[k - 1]=temp;
  }
  Bullet.MiscUtil.swap=function(list,index0,index1) {
    var temp=list[index0];
    list[index0]=list[index1];
    list[index1]=temp;
  }
  Bullet.MiscUtil.quickSort=function(list,compF) {
    //if (compF==null) throw arguments.callee.caller;
    if (list.length>1) this.quickSortInternal(list,compF,0,list.length-1);
  }
  Bullet.MiscUtil.quickSortInternal=function(list,compF,lo,hi) {
    
    var i = lo, j = hi;
    var x = list[Math.floor((lo + hi) / 2)];
    		do {
      			while (compF(list[i], x) < 0) i++;
      			while (compF(x,list[j]) < 0) j--;
      			if (i <= j) {
        				this.swap(list, i, j);
        				i++;
        				j--;
      			}
    		} 		while (i <= j);
    		if (lo < j) {
      this.			quickSortInternal(list, compF, lo, j);
    		}
    		if (i < hi) {
      this.			quickSortInternal(list, compF, i, hi);
    		}
  }
  Bullet.MatrixUtil={};
  Bullet.MatrixUtil.scale=function(dest,mat,s) {
    		dest.m00 = mat.m00 * s.x;   dest.m01 = mat.m01 * s.y;   dest.m02 = mat.m02 * s.z;
    		dest.m10 = mat.m10 * s.x;   dest.m11 = mat.m11 * s.y;   dest.m12 = mat.m12 * s.z;
    		dest.m20 = mat.m20 * s.x;   dest.m21 = mat.m21 * s.y;   dest.m22 = mat.m22 * s.z;
  }
  Bullet.MatrixUtil.absolute=function(mat) {
    		mat.m00 = Math.abs(mat.m00);
    		mat.m01 = Math.abs(mat.m01);
    		mat.m02 = Math.abs(mat.m02);
    		mat.m10 = Math.abs(mat.m10);
    		mat.m11 = Math.abs(mat.m11);
    		mat.m12 = Math.abs(mat.m12);
    		mat.m20 = Math.abs(mat.m20);
    		mat.m21 = Math.abs(mat.m21);
    		mat.m22 = Math.abs(mat.m22);
  }
  Bullet.MatrixUtil.tdotx=function(mat,vec) {
    		return mat.m00 * vec.x + mat.m10 * vec.y + mat.m20 * vec.z;
  }
  Bullet.MatrixUtil.tdoty=function(mat,vec) {
    		return mat.m01 * vec.x + mat.m11 * vec.y + mat.m21 * vec.z;
  }
  Bullet.MatrixUtil.tdotz=function(mat,vec) {
    return mat.m02 * vec.x + mat.m12 * vec.y + mat.m22 * vec.z;
  }
  Bullet.MatrixUtil.transposeTransform=function(dest,vec,mat) {
    var x = this.tdotx(mat, vec);
    var y = this.tdoty(mat, vec);
    var z = this.tdotz(mat, vec);
    dest.x = x;
    		dest.y = y;
    dest.z = z;
  }
  Bullet.MatrixUtil.setRotation=function(dest,q) {
    var d = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
    //    		assert (d != 0f);
    var s = 2 / d;
    var xs = q.x * s, ys = q.y * s, zs = q.z * s;
    var wx = q.w * xs, wy = q.w * ys, wz = q.w * zs;
    var xx = q.x * xs, xy = q.x * ys, xz = q.x * zs;
    var yy = q.y * ys, yz = q.y * zs, zz = q.z * zs;
    dest.m00 = 1 - (yy + zz);
    		dest.m01 = xy - wz;
    		dest.m02 = xz + wy;
    		dest.m10 = xy + wz;
    		dest.m11 = 1 - (xx + zz);
    		dest.m12 = yz - wx;
    		dest.m20 = xz - wy;
    		dest.m21 = yz + wx;
    		dest.m22 = 1 - (xx + yy);
  }
  Bullet.MatrixUtil.temp=new Array(4);
  Bullet.MatrixUtil.getRotation=function(mat,dest) {
    var 		trace = mat.m00 + mat.m11 + mat.m22;
    		if (trace > 0) {
      var s = Math.sqrt(trace + 1);
      		this.	temp[3] = (s * 0.5);
      			s = 0.5 / s;
      		this.	temp[0] = ((mat.m21 - mat.m12) * s);
      			this.temp[1] = ((mat.m02 - mat.m20) * s);
      			this.temp[2] = ((mat.m10 - mat.m01) * s);
    		} 		else {
      var i = mat.m00 < mat.m11 ? (mat.m11 < mat.m22 ? 2 : 1) : (mat.m00 < mat.m22 ? 2 : 0);
      var j = (i + 1) % 3;
      var k = (i + 2) % 3;
        
      var s = Math.sqrt(mat.getElement(i, i) - mat.getElement(j, j) - mat.getElement(k, k) + 1);
      			this.temp[i] = s * 0.5;
      			s = 0.5 / s;
        
      			this.temp[3] = (mat.getElement(k, j) - mat.getElement(j, k)) * s;
      			this.temp[j] = (mat.getElement(j, i) + mat.getElement(i, j)) * s;
      			this.temp[k] = (mat.getElement(k, i) + mat.getElement(i, k)) * s;
    		}
    		dest.set4(this.temp[0], this.temp[1], this.temp[2], this.temp[3]);
  }
  Bullet.ScalarUtil={};
  Bullet.ScalarUtil.fsel=function(a,b,c) {
    return a >= 0 ? b : c;
  }
  Bullet.ScalarUtil.fuzzyZero=function(x) {
    return Math.abs(x) < Bullet.BulletGlobals.FLT_EPSILON;
  }
  Bullet.VectorUtil={};
  Bullet.VectorUtil.maxAxis4=function(v) {
    var maxIndex = -1;
    var maxVal = -1e30;
    		if (v.x > maxVal) {
      			maxIndex = 0;
      			maxVal = v.x;
    		}
    		if (v.y > maxVal) {
      			maxIndex = 1;
      			maxVal = v.y;
    		}
    		if (v.z > maxVal) {
      			maxIndex = 2;
      			maxVal = v.z;
    		}
    		if (v.w > maxVal) {
      			maxIndex = 3;
      			maxVal = v.w;
    		}
    		return maxIndex;
  }
  Bullet.VectorUtil.closestAxis4=function(vec) {
    var tmp = new Vecmath.Vec4(vec);
    		tmp.absolute();
    		return this.maxAxis4(tmp);
  }
  Bullet.VectorUtil.add=function(dest,v1,v2,v3) {
    dest.x = v1.x + v2.x + v3.x;
    dest.y = v1.y + v2.y + v3.y;
    dest.z = v1.z + v2.z + v3.z;
  }
  Bullet.VectorUtil.add5=function(dest,v1,v2,v3,v4) {
    dest.x = v1.x + v2.x + v3.x + v4.x;
    dest.y = v1.y + v2.y + v3.y + v4.y;
    dest.z = v1.z + v2.z + v3.z + v4.z;
  }
  Bullet.VectorUtil.mul=function(dest,v1,v2) {
    dest.x = v1.x * v2.x;
    dest.y = v1.y * v2.y;
    dest.z = v1.z * v2.z;
  }
  Bullet.VectorUtil.setMin=function(a,b) {
    a.x = Math.min(a.x, b.x);
    a.y = Math.min(a.y, b.y);
    a.z = Math.min(a.z, b.z);
  }
  Bullet.VectorUtil.setMax=function(a,b) {
    a.x = Math.max(a.x, b.x);
    a.y = Math.max(a.y, b.y);
    a.z = Math.max(a.z, b.z);
  }
  Bullet.Transform=function() {
    this.basis=new Vecmath.Mat3();
    this.origin=new Vecmath.Vec3();
    this.vec=new Vecmath.Vec3();
    this.mat=new Vecmath.Mat3();
    //this.id=Bullet.transformC++;
  }
  Bullet.Transform.createM3=function(mat) {
    var t=new Bullet.Transform();
    t.basis.set1(mat);
    return t;
  }
  Bullet.Transform.createM4=function(mat) {
    var t=new Bullet.Transform();
    t.setM4(mat);
    return t;
  }
  Bullet.Transform.createT=function(t0) {
    var t=new Bullet.Transform();
    t.setT(t0);
    return t;
  }
  Bullet.Transform.prototype.setT=function(tr) {
    this.basis.set1(tr.basis);
    this.origin.set1(tr.origin);
  }
  Bullet.Transform.prototype.setM3=function(mat) {
    this.basis.set1(mat);
    this.origin.set(0,0,0);
  }
  Bullet.Transform.prototype.setM4=function(mat) {
    mat.getRotationScale(this.basis);
    this.origin.set(mat.m03, mat.m13, mat.m23);
  }
  Bullet.Transform.prototype.transform=function(v) {
    this.basis.transform1(v);
    v.add1(this.origin);
  }
  Bullet.Transform.prototype.setIdentity=function() {
    this.basis.setIdentity();
    this.origin.set3(0,0,0);
  }
  Bullet.Transform.prototype.inverse=function() {
    this.basis.transpose();
    this.origin.scale(-1);
    this.basis.transform1(this.origin);
  }
  Bullet.Transform.prototype.inverseT=function(tr) {
    this.set(tr);
    this.inverse();
  }
  Bullet.Transform.prototype.mul=function(tr) {
    this.vec.set1(tr.origin);//Vector3f vec = Stack_alloc(tr.origin);
    this.		transform(this.vec);
    this.		basis.mul1(tr.basis);
    this.		origin.set1(this.vec);
  }
  Bullet.Transform.prototype.invXform=function(inVec,out) {
    		out.sub2(inVec,this.origin);
        
    this.mat.set1(this.basis);//		Matrix3f mat = Stack._alloc(basis);
    this.		mat.transpose();
    this.		mat.transform1(out);
  }
  Bullet.Transform.prototype.getRotation=function(out) {
    Bullet.		MatrixUtil.getRotation(this.basis, out);
    		return out;
  }
  Bullet.Transform.prototype.setRotation=function(q) {
    Bullet.		MatrixUtil.setRotation(this.basis,q);
  }
  Bullet.Transform.prototype.getMatrix=function(out) {
    out.set1(this.basis);
    out.m03 = this.origin.x;
    out.m13 = this.origin.y;
    out.m23 = this.origin.z;
    return out;
  }
  Bullet.Transform.prototype.toString=function() {
    return "T"+"("+this.basis+" "+this.origin+")";
  }
  Bullet.TransformUtil={}
  Bullet.TransformUtil.SIMDSQRT12=0.7071067811865475244008443621048490;
  Bullet.TransformUtil.ANGULAR_MOTION_THRESHOLD=0.5*6.283185307179586232*0.25;
  Bullet.TransformUtil.recipSqrt=function(x) {
    return 1/Math.sqrt(x);
  }
  Bullet.TransformUtil.planeSpace1=function(n,p,q) {
    if (Math.abs(n.z) > this.SIMDSQRT12) {
      // choose p in y-z plane
      var a = n.y * n.y + n.z * n.z;
      var k = this.recipSqrt(a);
      	p.set3(0, -n.z * k, n.y * k);
      // set q = n x p
      	q.set3(a * k, -n.x * p.z, n.x * p.y);
    } else {
      			// choose p in x-y plane
      var a = n.x * n.x + n.y * n.y;
      var k = this.recipSqrt(a);
      p.set3(-n.y * k, n.x * k, 0);
      // set q = n x p
      	q.set3(-n.z * p.y, n.z * p.x, a * k);
    }
  }
  Bullet.TransformUtil.axis=new Vecmath.Vec3();
  Bullet.TransformUtil.dorn=new Vecmath.Quat4();
  Bullet.TransformUtil.orn0=new Vecmath.Quat4();
  Bullet.TransformUtil.predictedOrn=new Vecmath.Quat4();
  Bullet.TransformUtil.integrateTransform=function(curTrans,linvel,angvel,timeStep,predictedTransform) {
    //ullet.log("TransformUtil.integrateTransform "+predictedTransform+" "+curTrans+" linvel="+linvel+" angvel="+angvel+" "+timeStep);
    		predictedTransform.origin.scaleAdd(timeStep, linvel, curTrans.origin);
    //ullet.log("TransformUtil.integrateTransform "+predictedTransform+" "+curTrans);
        		
    this.	axis.set3(0,0,0);//	Vector3f axis = Stack._alloc(Vector3f.class);
    var fAngle = angvel.length();
        
    		// limit the angular motion
    if (fAngle * timeStep > Bullet.TransformUtil.ANGULAR_MOTION_THRESHOLD) {
      			fAngle = Bullet.TransformUtil.ANGULAR_MOTION_THRESHOLD / timeStep;
    		}
        
    		if (fAngle < 0.001) {
      // use Taylor's expansions of sync function			
      this.axis.scale2(0.5 * timeStep - (timeStep * timeStep * timeStep) * (0.020833333333) * fAngle * fAngle, angvel);
    } else {
      			// sync(fAngle) = sin(c*fAngle)/t
      			this.axis.scale2(Math.sin(0.5 * fAngle * timeStep) / fAngle, angvel);
    }
    this.dorn.set4(0,0,0,0);//		Quat4f dorn = Stack._alloc(Quat4f.class);
    this.dorn.set4(this.axis.x, this.axis.y, this.axis.z, Math.cos(fAngle * timeStep * 0.5));
    this.orn0.set4(0,0,0,0);this.orn0=curTrans.getRotation(this.orn0);//		Quat4f orn0 = curTrans.getRotation(Stack._alloc(Quat4f.class));
        
    this.predictedOrn.set4(0,0,0,0);//		Quat4f predictedOrn = Stack._alloc(Quat4f.class);
    		this.predictedOrn.mul(this.dorn,this.orn0);
    		this.predictedOrn.normalize();
    //  #endif
    		predictedTransform.setRotation(this.predictedOrn);
  }
  Bullet.MotionState=function(startTrans) {
    this.graphicsWorldTrans=new Bullet.Transform();
    this.centerOfMassOffset=new Bullet.Transform();
    this.startWorldTrans=new Bullet.Transform();
    this.graphicsWorldTrans.setT(startTrans);
    this.centerOfMassOffset.setIdentity();
    this.startWorldTrans.setT(startTrans);
  }
  Bullet.MotionState.prototype.getWorldTransform=function(out) {
    out.inverse(this.centerOfMassOffset);
    out.mul(this.graphicsWorldTrans);
    return out;
  }
  Bullet.MotionState.prototype.setWorldTransform=function(centerOfMassWorldTrans) {
    this.graphicsWorldTrans.set(centerOfMassWorldTrans);
    this.graphicsWorldTrans.mul(centerOfMassOffset);
  }
  Bullet.ManifoldPoint=function() {
    this.localPointA=new Vecmath.Vec3();
    this.localPointB=new Vecmath.Vec3();
    this.positionWorldOnB=new Vecmath.Vec3();
    this.positionWorldOnA=new Vecmath.Vec3();
    this.normalWorldOnB=new Vecmath.Vec3();
    this.lateralFrictionDir1=new Vecmath.Vec3();
    this.lateralFrictionDir2=new Vecmath.Vec3();
    this.userPersistentData = null;
    this.appliedImpulse = 0;
    this.lateralFrictionInitialized = false;
    	this.lifeTime = 0;
  }
  Bullet.ManifoldPoint.prototype.distance1=0;
  Bullet.ManifoldPoint.prototype.combinedFriction=0;
  Bullet.ManifoldPoint.prototype.combinedRestitution=0;
  Bullet.ManifoldPoint.prototype.partId0=0;
  Bullet.ManifoldPoint.prototype.partId1=0;
  Bullet.ManifoldPoint.prototype.index0=0;
  Bullet.ManifoldPoint.prototype.index1=0;
  Bullet.ManifoldPoint.prototype.appliedImpulse=0;
  Bullet.ManifoldPoint.prototype.lateralFrictionInitialized=false;
  Bullet.ManifoldPoint.prototype.appliedImpulseLateral1=0;
  Bullet.ManifoldPoint.prototype.appliedImpulseLateral2=0;
  Bullet.ManifoldPoint.prototype.lifeTime=0;
  Bullet.ManifoldPoint.prototype.init=function(pointA,pointB,normal,distance) {
    this.localPointA.set1(pointA);
    this.localPointB.set1(pointB);
    this.normalWorldOnB.set1(normal);
    this.distance1 = distance;
    this.combinedFriction = 0;
    this.combinedRestitution = 0;
    this.userPersistentData = null;
    this.appliedImpulse = 0;
    this.lateralFrictionInitialized = false;
    this.appliedImpulseLateral1 = 0;
    this.appliedImpulseLateral2 = 0;
    this.lifeTime = 0;
  }
  Bullet.ManifoldPoint.prototype.set=function(p) {
    this.localPointA.set1(p.localPointA);
    this.localPointB.set1(p.localPointB);
    this.positionWorldOnA.set1(p.positionWorldOnA);
    this.positionWorldOnB.set1(p.positionWorldOnB);
    this.normalWorldOnB.set1(p.normalWorldOnB);
    this.distance1 = p.distance1;
    this.combinedFriction = p.combinedFriction;
    this.combinedRestitution = p.combinedRestitution;
    this.partId0 = p.partId0;
    this.partId1 = p.partId1;
    this.index0 = p.index0;
    this.index1 = p.index1;
    this.userPersistentData = p.userPersistentData;
    this.appliedImpulse = p.appliedImpulse;
    this.lateralFrictionInitialized = p.lateralFrictionInitialized;
    this.appliedImpulseLateral1 = p.appliedImpulseLateral1;
    this.appliedImpulseLateral2 = p.appliedImpulseLateral2;
    this.lifeTime = p.lifeTime;
    this.lateralFrictionDir1.set1(p.lateralFrictionDir1);
    this.lateralFrictionDir2.set1(p.lateralFrictionDir2);
  }
  Bullet.ManifoldPoint.prototype.getPositionWorldOnA=function(out) {
    out.set1(this.positionWorldOnA);
    		return out;
  }
  Bullet.ManifoldPoint.prototype.getPositionWorldOnB=function(out) {
    out.set1(this.positionWorldOnB);
    		return out;
  }
  Bullet.ManifoldPoint.prototype.toString=function() {
    return "ManifoldPoint("+this.localPointA+","+this.localPointB+")";
  }
  Bullet.PersistentManifold=function() {
    this.pointCache=new Array(Bullet.PersistentManifold.prototype.MANIFOLD_CACHE_SIZE);
    this.cross=new Vecmath.Vec3();
    this.a0=new Vecmath.Vec3();
    this.b0=new Vecmath.Vec3();
    this.a1=new Vecmath.Vec3();
    this.b1=new Vecmath.Vec3();
    this.a2=new Vecmath.Vec3();
    this.b2=new Vecmath.Vec3();
    this.a3=new Vecmath.Vec3();
    this.b3=new Vecmath.Vec3();
    this.maxvec=new Vecmath.Vec4();
    this.diffA=new Vecmath.Vec3();
    this.tmp=new Vecmath.Vec3();
    this.projectedDifference=new Vecmath.Vec3();
    this.projectedPoint=new Vecmath.Vec3();
    for (var i=0; i<this.pointCache.length; i++) this.pointCache[i] = new Bullet.ManifoldPoint();
  }
  Bullet.PersistentManifold.prototype.MANIFOLD_CACHE_SIZE=4;
  Bullet.PersistentManifold.prototype.cachedPoints=0;
  Bullet.PersistentManifold.prototype.index1a=0;
  Bullet.PersistentManifold.prototype.init=function(body0,body1,b1a) {
    this.body0 = body0;
    this.body1 = body1;
    this.cachedPoints = 0;
    this.index1a = 0;
  }
  Bullet.PersistentManifold.prototype.sortCachedPoints=function(pt) {
    //calculate 4 possible cases areas, and take biggest area
    //also need to keep 'deepest'
    var maxPenetrationIndex = -1;
    var maxPenetration = pt.distance1;
    for (var i = 0; i < 4; i++) {
      if (this.pointCache[i].distance1 < maxPenetration) {
        maxPenetrationIndex = i;
        maxPenetration = this.pointCache[i].distance1;
      }
    }
    var res0 = 0, res1 = 0, res2 = 0, res3 = 0;
    if (maxPenetrationIndex != 0) {
      this.a0.set1(pt.localPointA);
      this.a0.sub1(this.pointCache[1].localPointA);
      this.b0.set1(this.pointCache[3].localPointA);
      this.b0.sub1(this.pointCache[2].localPointA);
      this.cross.cross(this.a0, this.b0);
      res0 = this.cross.lengthSquared();
    } 
    if (maxPenetrationIndex != 1) {
      this.a1.set1(pt.localPointA);
      this.a1.sub1(this.pointCache[0].localPointA);
      this.b1.set1(this.pointCache[3].localPointA);
      this.b1.sub1(this.pointCache[2].localPointA);
      this.cross.cross(this.a1,this.b1);
      res1 = this.cross.lengthSquared();
    }   
    if (maxPenetrationIndex != 2) {
      this.a2.set1(pt.localPointA);
      this.a2.sub1(this.pointCache[0].localPointA);
      this.b2.set1(this.pointCache[3].localPointA);
      this.b2.sub1(this.pointCache[1].localPointA);
      this.cross.cross(this.a2,this.b2);
      res2 = this.cross.lengthSquared();
    }
    if (maxPenetrationIndex != 3) {
      this.a3.set1(pt.localPointA);
      this.a3.sub1(this.pointCache[0].localPointA);
      this.b3.set1(this.pointCache[2].localPointA);
      this.b3.sub1(this.pointCache[1].localPointA);
      this.cross.cross(this.a3,this.b3);
      res3 = this.cross.lengthSquared();
    }
    this.maxvec.set4(res0, res1, res2, res3);
    var biggestarea = Bullet.VectorUtil.closestAxis4(this.maxvec);
    return biggestarea;
  }
  Bullet.PersistentManifold.prototype.getCacheEntry=function(newPoint) {
    var shortestDist = Bullet.BulletGlobals.contactBreakingThreshold * Bullet.BulletGlobals.contactBreakingThreshold;
    var size = this.cachedPoints;
    var nearestPoint = -1;
    this.diffA.set3(0,0,0);
    for (var i = 0; i < size; i++) {
      var mp = this.pointCache[i];
      this.diffA.sub2(mp.localPointA, newPoint.localPointA);
      var distToManiPoint = this.diffA.dot(this.diffA);
      if (distToManiPoint < shortestDist) {
        shortestDist = distToManiPoint;
        nearestPoint = i;
      }
    }
    return nearestPoint;
  }
  Bullet.PersistentManifold.prototype.addManifoldPoint=function(newPoint) {
    var insertIndex = this.cachedPoints;
    if (insertIndex == this.MANIFOLD_CACHE_SIZE) {
      if (this.MANIFOLD_CACHE_SIZE >= 4) {
        insertIndex = this.sortCachedPoints(newPoint);
      } else {
        insertIndex = 0;
      }
    } else {
      this.cachedPoints++;
    }
    this.pointCache[insertIndex].set(newPoint);
    return insertIndex;
    
  }
  Bullet.PersistentManifold.prototype.removeContactPoint=function(index) {
    var lastUsedIndex = this.cachedPoints - 1;
    if (index != lastUsedIndex) {
      // TODO: possible bug
      this.pointCache[index].set(this.pointCache[lastUsedIndex]);
      //get rid of duplicated userPersistentData pointer
      this.pointCache[lastUsedIndex].userPersistentData = null;
      this.pointCache[lastUsedIndex].appliedImpulse = 0;
      this.pointCache[lastUsedIndex].lateralFrictionInitialized = false;
      this.pointCache[lastUsedIndex].appliedImpulseLateral1 = 0;
      this.pointCache[lastUsedIndex].appliedImpulseLateral2 = 0;
      this.pointCache[lastUsedIndex].lifeTime = 0;
    }
    this.cachedPoints--;
  }
  Bullet.PersistentManifold.prototype.replaceContactPoint=function(newPoint,insertIndex) {
    var lifeTime = this.pointCache[insertIndex].lifeTime;
    var appliedImpulse = this.pointCache[insertIndex].appliedImpulse;
    var appliedLateralImpulse1 = this.pointCache[insertIndex].appliedImpulseLateral1;
    var appliedLateralImpulse2 = this.pointCache[insertIndex].appliedImpulseLateral2;
    
    var cache = this.pointCache[insertIndex].userPersistentData;
    this.pointCache[insertIndex].set(newPoint);
    this.pointCache[insertIndex].userPersistentData = cache;
    this.pointCache[insertIndex].appliedImpulse = appliedImpulse;
    this.pointCache[insertIndex].appliedImpulseLateral1 = appliedLateralImpulse1;
    this.pointCache[insertIndex].appliedImpulseLateral2 = appliedLateralImpulse2;
    this.pointCache[insertIndex].lifeTime = lifeTime;
  }
  Bullet.PersistentManifold.prototype.validContactDistance=function(pt) {
    return pt.distance1 <= Bullet.BulletGlobals.contactBreakingThreshold;
  }
  Bullet.PersistentManifold.prototype.refreshContactPoints=function(trA,trB) {
    this.tmp.set3(0,0,0);
    var i;
    for (i = this.cachedPoints - 1; i >= 0; i--) {
      var manifoldPoint = this.pointCache[i];
      manifoldPoint.positionWorldOnA.set1(manifoldPoint.localPointA);
      trA.transform(manifoldPoint.positionWorldOnA);
      manifoldPoint.positionWorldOnB.set1(manifoldPoint.localPointB);
      trB.transform(manifoldPoint.positionWorldOnB);
      this.tmp.set1(manifoldPoint.positionWorldOnA);
      this.tmp.sub1(manifoldPoint.positionWorldOnB);
      manifoldPoint.distance1 = this.tmp.dot(manifoldPoint.normalWorldOnB);
      manifoldPoint.lifeTime++;
    }
    var distance2d;
    this.projectedDifference.set3(0,0,0);this.projectedPoint.set3(0,0,0);
    for (i = this.cachedPoints - 1; i >= 0; i--) {
      var manifoldPoint = this.pointCache[i];
      // contact becomes invalid when signed distance exceeds margin (projected on contactnormal direction)
      if (!this.validContactDistance(manifoldPoint)) {
        this.removeContactPoint(i);
      } else {
        // contact also becomes invalid when relative movement orthogonal to normal exceeds margin
        this.tmp.scale2(manifoldPoint.distance1, manifoldPoint.normalWorldOnB);
        this.projectedPoint.sub2(manifoldPoint.positionWorldOnA, this.tmp);
        this.projectedDifference.sub2(manifoldPoint.positionWorldOnB, this.projectedPoint);
        distance2d = this.projectedDifference.dot(this.projectedDifference);
        if (distance2d > Bullet.BulletGlobals.contactBreakingThreshold * Bullet.BulletGlobals.contactBreakingThreshold) {
          this.removeContactPoint(i);
        }  else {
          // contact point processed callback
        }
      }
    }
  }
  Bullet.PersistentManifold.prototype.clearManifold=function() {
    this.cachedPoints = 0;
  }
  Bullet.PersistentManifold.prototype.toString=function() {
    return "PersistentManifold("+this.cachedPoints+","+this.pointCache[0]+"..)";
  }
  Bullet.ClosestPointInput=function() {
    this.transformA = new Bullet.Transform();
    this.transformB = new Bullet.Transform();
    this.init();
  }
  Bullet.ClosestPointInput.prototype.maximumDistanceSquared=0;
  Bullet.ClosestPointInput.prototype.init=function() {
    this.maximumDistanceSquared = Number.MAX_VALUE;
  }
  Bullet.ClosestPointInput.prototype.toString=function() {
    return "ClosestPointInput("+this.maximumDistanceSquared+","+this.transformA+","+this.transformB+")";
  }
  Bullet.UsageBitfield=function() {}
  Bullet.UsageBitfield.prototype.usedVertexA=false;
  Bullet.UsageBitfield.prototype.usedVertexB=false;
  Bullet.UsageBitfield.prototype.usedVertexC=false;
  Bullet.UsageBitfield.prototype.usedVertexD=false;
  Bullet.UsageBitfield.prototype.reset=function() {
    this.usedVertexA = false;
    this.usedVertexB = false;
    this.usedVertexC = false;
    this.usedVertexD = false;
  }
  Bullet.SubSimplexClosestResult=function() {
    this.closestPointOnSimplex=new Vecmath.Vec3();
    this.usedVertices=new Bullet.UsageBitfield();
    this.barycentricCoords = new Array(4);
  }
  Bullet.SubSimplexClosestResult.prototype.degenerate=false;
  Bullet.SubSimplexClosestResult.prototype.reset=function() {
    this.degenerate = false;
    this.setBarycentricCoordinates(0, 0, 0, 0);
    this.usedVertices.reset();
  }
  Bullet.SubSimplexClosestResult.prototype.isValid=function() {
    var valid = (this.barycentricCoords[0] >= 0) &&
      (this.barycentricCoords[1] >= 0) &&
      (this.barycentricCoords[2] >= 0) &&
      (this.barycentricCoords[3] >= 0);
    return valid;
  }
  Bullet.SubSimplexClosestResult.prototype.setBarycentricCoordinates=function(a,b,c,d) {
    this.barycentricCoords[0] = a;
    this.barycentricCoords[1] = b;
    this.barycentricCoords[2] = c;
    this.barycentricCoords[3] = d;
  }
  Bullet.poolSubSimplexClosestResult=new Bullet.ObjectPool(function() {
    return new Bullet.SubSimplexClosestResult()
  }
  );
  Bullet.SimplexSolver=function() {
    this.simplexVectorW = new Array(Bullet.SimplexSolver.prototype.VORONOI_SIMPLEX_MAX_VERTS);
    this.simplexPointsP = new Array(Bullet.SimplexSolver.prototype.VORONOI_SIMPLEX_MAX_VERTS);
    this.simplexPointsQ = new Array(Bullet.SimplexSolver.prototype.VORONOI_SIMPLEX_MAX_VERTS);
    this.cachedP1 = new Vecmath.Vec3();
    this.cachedP2 = new Vecmath.Vec3();
    this.cachedV = new Vecmath.Vec3();
    this.lastW = new Vecmath.Vec3();
    this.cachedBC = new Bullet.SubSimplexClosestResult();
    this.tmp=new Vecmath.Vec3();
    this.nearest=new Vecmath.Vec3();
    this.p=new Vecmath.Vec3();
    this.diff=new Vecmath.Vec3();
    this.v=new Vecmath.Vec3();
    this.tmp1=new Vecmath.Vec3();
    this.tmp2=new Vecmath.Vec3();
    this.tmp3=new Vecmath.Vec3();
    this.tmp4=new Vecmath.Vec3();
    this.ab=new Vecmath.Vec3();
    this.ac=new Vecmath.Vec3();
    this.ap=new Vecmath.Vec3();
    this.bp=new Vecmath.Vec3();
    this.cp=new Vecmath.Vec3();
    this.tmp_=new Vecmath.Vec3();
    this.normal=new Vecmath.Vec3();
    this.q=new Vecmath.Vec3();
    for (var i=0; i<this.VORONOI_SIMPLEX_MAX_VERTS; i++) {
       this.simplexVectorW[i] = new Vecmath.Vec3();
       this.simplexPointsP[i] = new Vecmath.Vec3();
       this.simplexPointsQ[i] = new Vecmath.Vec3();
    }
  }
  Bullet.SimplexSolver.prototype.subsimplexResultsPool = Bullet.poolSubSimplexClosestResult;
  Bullet.SimplexSolver.prototype.VORONOI_SIMPLEX_MAX_VERTS = 5;
  Bullet.SimplexSolver.VERTA = 0;
  Bullet.SimplexSolver.VERTB = 1;
  Bullet.SimplexSolver.VERTC = 2;
  Bullet.SimplexSolver.VERTD = 3;
  Bullet.SimplexSolver.prototype.numVertices=0;
  Bullet.SimplexSolver.prototype.cachedValidClosest=false;
  Bullet.SimplexSolver.prototype.needsUpdate=false;
  Bullet.SimplexSolver.prototype.removeVertex=function(index) {
    this.numVertices--;
    this.simplexVectorW[index].set1(this.simplexVectorW[this.numVertices]);
    this.simplexPointsP[index].set1(this.simplexPointsP[this.numVertices]);
    this.simplexPointsQ[index].set1(this.simplexPointsQ[this.numVertices]);
    
  }
  Bullet.SimplexSolver.prototype.reduceVertices=function(usedVerts) {
    if ((this.numVertices >= 4) && (!usedVerts.usedVertexD))
      this.removeVertex(3);
    if ((this.numVertices >= 3) && (!usedVerts.usedVertexC))
      this.removeVertex(2);
    if ((this.numVertices >= 2) && (!usedVerts.usedVertexB))
      this.removeVertex(1);
    if ((this.numVertices >= 1) && (!usedVerts.usedVertexA))
      this.removeVertex(0);
  }
  Bullet.SimplexSolver.prototype.updateClosestVectorAndPoints=function() {
    if (this.needsUpdate) {
      this.cachedBC.reset();
      this.needsUpdate = false;
     
    switch (this.numVertices) {
      case 0:
      this.cachedValidClosest = false;
      break;
      case 1:
      {
      this.cachedP1.set1(this.simplexPointsP[0]);
      this.cachedP2.set1(this.simplexPointsQ[0]);
      this.cachedV.sub2(this.cachedP1,this.cachedP2); //== m_simplexVectorW[0]
      this.cachedBC.reset();
      this.cachedBC.setBarycentricCoordinates(1, 0, 0, 0);
      this.cachedValidClosest = this.cachedBC.isValid();
      break;
      }
      case 2:
      {
      this.tmp.set3(0,0,0);
      //closest point origin from line segment
      var from = this.simplexVectorW[0];
      var to = this.simplexVectorW[1];
      this.nearest.set3(0,0,0);
      
      this.p.set3(0,0,0);
      this.diff.set3(0,0,0);
      this.diff.sub2(this.p, from);
      
      this.v.set3(0,0,0);
      this.v.sub2(to, from);
      
      var t = this.v.dot(this.diff);
      if (t > 0) {
        var dotVV = this.v.dot(this.v);
        if (t < dotVV) {
          t /= dotVV;
          this.tmp.scale2(t,this.v);
          this.diff.sub1(this.tmp);
          this.cachedBC.usedVertices.usedVertexA = true;
          this.cachedBC.usedVertices.usedVertexB = true;
        } else {
          t = 1;
          this.diff.sub1(this.v);
          // reduce to 1 point
          this.cachedBC.usedVertices.usedVertexB = true;
        }
      } else {
        t = 0;
        //reduce to 1 point
        this.cachedBC.usedVertices.usedVertexA = true;
      }
      this.cachedBC.setBarycentricCoordinates(1-t, t, 0, 0);
      this.tmp.scale2(t,this.v);
      this.nearest.add2(from,this.tmp);
      
      this.tmp.sub2(this.simplexPointsP[1],this.simplexPointsP[0]);
      this.tmp.scale1(t);
      this.cachedP1.add2(this.simplexPointsP[0],this.tmp);
      
      this.tmp.sub2(this.simplexPointsQ[1],this.simplexPointsQ[0]);
      this.tmp.scale1(t);
      this.cachedP2.add2(this.simplexPointsQ[0],this.tmp);
      
      this.cachedV.sub2(this.cachedP1,this.cachedP2);
      this.reduceVertices(this.cachedBC.usedVertices);
      
      this.cachedValidClosest = this.cachedBC.isValid();
      break;
      }
      case 3: 
      { 
      this.tmp1.set3(0,0,0);
      this.tmp2.set3(0,0,0);
      this.tmp3.set3(0,0,0);
      
      // closest point origin from triangle 
      this.p.set3(0,0,0);
      var a = this.simplexVectorW[0]; 
      var b = this.simplexVectorW[1]; 
      var c = this.simplexVectorW[2]; 
      
      this.closestPtPointTriangle(this.p,a,b,c,this.cachedBC);
      
      //if (Bullet.dbg)  ullet.log("ss simplexPointP="+this.simplexPointsP);
      //if (Bullet.dbg)  ullet.log("ss simplexPointQ="+this.simplexPointsQ);
      //if (Bullet.dbg)  ullet.log("ss barycentricCoords="+this.cachedBC.barycentricCoords);
      
      this.tmp1.scale2(this.cachedBC.barycentricCoords[0], this.simplexPointsP[0]);
      this.tmp2.scale2(this.cachedBC.barycentricCoords[1], this.simplexPointsP[1]);
      this.tmp3.scale2(this.cachedBC.barycentricCoords[2], this.simplexPointsP[2]);
      Bullet.VectorUtil.add(this.cachedP1, this.tmp1, this.tmp2, this.tmp3);
      
      this.tmp1.scale2(this.cachedBC.barycentricCoords[0], this.simplexPointsQ[0]);
      this.tmp2.scale2(this.cachedBC.barycentricCoords[1], this.simplexPointsQ[1]);
      this.tmp3.scale2(this.cachedBC.barycentricCoords[2], this.simplexPointsQ[2]);
      Bullet.VectorUtil.add(this.cachedP2, this.tmp1, this.tmp2, this.tmp3);
      
      this.cachedV.sub2(this.cachedP1, this.cachedP2);
      //if (Bullet.dbg) ullet.log("ss cachedP1="+this.cachedP1+" cachedP2="+this.cachedP2+" cachedV="+this.cachedV);
      
      this.reduceVertices(this.cachedBC.usedVertices);
      this.cachedValidClosest = this.cachedBC.isValid(); 
      
      break; 
      }
      case 4:
      {
      this.tmp1.set3(0,0,0);
      this.tmp2.set3(0,0,0);
      this.tmp3.set3(0,0,0);
      this.tmp4.set3(0,0,0);
      
      this.p.set3(0,0,0);
      
      var a = this.simplexVectorW[0];
      var b = this.simplexVectorW[1];
      var c = this.simplexVectorW[2];
      var d = this.simplexVectorW[3];
      
      var hasSeperation = this.closestPtPointTetrahedron(this.p,a,b,c,d,this.cachedBC);
      if (hasSeperation) {
        this.tmp1.scale2(this.cachedBC.barycentricCoords[0], this.simplexPointsP[0]);
        this.tmp2.scale2(this.cachedBC.barycentricCoords[1], this.simplexPointsP[1]);
        this.tmp3.scale2(this.cachedBC.barycentricCoords[2], this.simplexPointsP[2]);
        this.tmp4.scale2(this.cachedBC.barycentricCoords[3], this.simplexPointsP[3]);
        Bullet.VectorUtil.add(this.cachedP1, this.tmp1, this.tmp2, this.tmp3, this.tmp4);
      
        this.tmp1.scale2(this.cachedBC.barycentricCoords[0], this.simplexPointsQ[0]);
        this.tmp2.scale2(this.cachedBC.barycentricCoords[1], this.simplexPointsQ[1]);
        this.tmp3.scale2(this.cachedBC.barycentricCoords[2], this.simplexPointsQ[2]);
        this.tmp4.scale2(this.cachedBC.barycentricCoords[3], this.simplexPointsQ[3]);
        Bullet.VectorUtil.add(this.cachedP2, this.tmp1, this.tmp2, this.tmp3, this.tmp4);
      
        this.cachedV.sub2(this.cachedP1, this.cachedP2);
        this.reduceVertices (this.cachedBC.usedVertices);
      } else {
        if (this.cachedBC.degenerate) {
          this.cachedValidClosest = false;
        } else {
          this.cachedValidClosest = true;
          //degenerate case == false, penetration = true + zero
          this.cachedV.set3(0,0,0);
        }
        break;
      }
      
      this.cachedValidClosest = this.cachedBC.isValid();
      
      //closest point origin from tetrahedron
      break;
      }
      default:
      {
      this.cachedValidClosest = false;
      }
    }
    }
        
    return this.cachedValidClosest;
  }
  Bullet.SimplexSolver.prototype.closestPtPointTriangle=function(p,a,b,c,result) {
    result.usedVertices.reset();
    // Check if P in vertex region outside A
    this.ab.set3(0,0,0);
    this.ab.sub2(b, a);
    this.ac.set3(0,0,0);
    this.ac.sub2(c, a);
    this.ap.set3(0,0,0);
    this.ap.sub2(p, a);
    var d1 = this.ab.dot(this.ap);
    var d2 = this.ac.dot(this.ap);
    if (d1 <= 0 && d2 <= 0)  {
      result.closestPointOnSimplex.set1(a);
      result.usedVertices.usedVertexA = true;
      result.setBarycentricCoordinates(1, 0, 0, 0);
      return true; // a; // barycentric coordinates (1,0,0)
    }
        
    // Check if P in vertex region outside B
    this.bp.set3(0,0,0);
    this.bp.sub2(p, b);
    var d3 = this.ab.dot(this.bp);
    var d4 = this.ac.dot(this.bp);
    if (d3 >= 0 && d4 <= d3) {
      result.closestPointOnSimplex.set1(b);
      result.usedVertices.usedVertexB = true;
      result.setBarycentricCoordinates(0, 1, 0, 0);
      return true; 
    }
        
    // Check if P in edge region of AB, if so return projection of P onto AB
    var vc = d1*d4 - d3*d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      var v = d1 / (d1 - d3);
      result.closestPointOnSimplex.scaleAdd(v, this.ab, a);
      result.usedVertices.usedVertexA = true;
      result.usedVertices.usedVertexB = true;
      result.setBarycentricCoordinates(1-v, v, 0, 0);
      return true;
    }
        
    // Check if P in vertex region outside C
    this.cp.set3(0,0,0);//Vector3f cp = Stack._alloc(Vector3f.class);
    this.cp.sub2(p, c);
        
    var d5 = this.ab.dot(this.cp);
    var d6 = this.ac.dot(this.cp);
        
    if (d6 >= 0 && d5 <= d6) {
      result.closestPointOnSimplex.set1(c);
      result.usedVertices.usedVertexC = true;
      result.setBarycentricCoordinates(0, 0, 1, 0);
      return true;
    }
        
    // Check if P in edge region of AC, if so return projection of P onto AC
    var vb = d5*d2 - d1*d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      var w = d2 / (d2 - d6);
      result.closestPointOnSimplex.scaleAdd(w, this.ac, a);
      result.usedVertices.usedVertexA = true;
      result.usedVertices.usedVertexC = true;
      result.setBarycentricCoordinates(1-w, 0, w, 0);
      return true;
    }
        
    // Check if P in edge region of BC, if so return projection of P onto BC
    var va = d3*d6 - d5*d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
      var w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
      this.tmp.set3(0,0,0);//Vector3f tmp = Stack._alloc(Vector3f.class);
      this.tmp.sub2(c, b);
      result.closestPointOnSimplex.scaleAdd(w, this.tmp, b);
        
      result.usedVertices.usedVertexB = true;
      result.usedVertices.usedVertexC = true;
      result.setBarycentricCoordinates(0, 1-w, w, 0);
      return true;
    }
    
    // P inside face region. Compute Q through its barycentric coordinates (u,v,w)
    var denom = 1 / (va + vb + vc);
    var v = vb * denom;
    var w = vc * denom;
        
    this.tmp1.set3(0,0,0);
    this.tmp2.set3(0,0,0);
        
    this.tmp1.scale2(v, this.ab);
    this.tmp2.scale2(w, this.ac);
    Bullet.VectorUtil.add(result.closestPointOnSimplex, a, this.tmp1, this.tmp2);
    result.usedVertices.usedVertexA = true;
    result.usedVertices.usedVertexB = true;
    result.usedVertices.usedVertexC = true;
    result.setBarycentricCoordinates(1-v-w, v, w, 0);
    return true;
  }
  Bullet.SimplexSolver.prototype.pointOutsideOfPlane=function(p,a,b,c,d) {
    var tmp=this.tmp_;tmp.set3(0,0,0);
      
    this.normal.set3(0,0,0);
    this.normal.sub2(b,a);
    tmp.sub2(c,a);
    this.normal.cross(this.normal,tmp);
    tmp.sub2(p,a);
    var signp = tmp.dot(this.normal); // [AP AB AC]
      
    tmp.sub2(d,a);
    var signd = tmp.dot(this.normal); // [AD AB AC]
      
    if (signd * signd < ((1e-4) * (1e-4))) {
      return -1;
    }
    // Points on opposite sides if expression signs are opposite
    return (signp * signd < 0)? 1 : 0;
  }
  Bullet.SimplexSolver.prototype.closestPtPointTetrahedron=function(p,a,b,c,d,finalResult) {
    var tempResult = this.subsimplexResultsPool.get();
    tempResult.reset();
    try {
    this.tmp.set3(0,0,0);
    this.q.set3(0,0,0);
        
    // Start out assuming point inside all halfspaces, so closest to itself
    finalResult.closestPointOnSimplex.set1(p);
    finalResult.usedVertices.reset();
    finalResult.usedVertices.usedVertexA = true;
    finalResult.usedVertices.usedVertexB = true;
    finalResult.usedVertices.usedVertexC = true;
    finalResult.usedVertices.usedVertexD = true;
        
    var pointOutsideABC = this.pointOutsideOfPlane(p, a, b, c, d);
    var pointOutsideACD = this.pointOutsideOfPlane(p, a, c, d, b);
    var pointOutsideADB = this.pointOutsideOfPlane(p, a, d, b, c);
    var pointOutsideBDC = this.pointOutsideOfPlane(p, b, d, c, a);
        
    if (pointOutsideABC < 0 || pointOutsideACD < 0 || pointOutsideADB < 0 || pointOutsideBDC < 0) {
      finalResult.degenerate = true;
      return false;
    }
        
    if (pointOutsideABC == 0 && pointOutsideACD == 0 && pointOutsideADB == 0 && pointOutsideBDC == 0) {
      return false;
    }
       
    var bestSqDist = Number.MAX_VALUE;
    // If point outside face abc then compute closest point on abc
    if (pointOutsideABC != 0)  {
      this.closestPtPointTriangle(p, a, b, c,tempResult);
      this.q.set1(tempResult.closestPointOnSimplex);
        
      this.tmp.sub2(this.q, p);
      var sqDist = this.tmp.dot(this.tmp);
      // Update best closest point if (squared) distance is less than current best
      if (sqDist < bestSqDist) {
        bestSqDist = sqDist;
        finalResult.closestPointOnSimplex.set1(this.q);
        //convert result bitmask!
        finalResult.usedVertices.reset();
        finalResult.usedVertices.usedVertexA = tempResult.usedVertices.usedVertexA;
        finalResult.usedVertices.usedVertexB = tempResult.usedVertices.usedVertexB;
        finalResult.usedVertices.usedVertexC = tempResult.usedVertices.usedVertexC;
        finalResult.setBarycentricCoordinates(
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTA],
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTB],
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTC],0);
      }
    }
    // Repeat test for face acd
    if (pointOutsideACD != 0) {
      this.closestPtPointTriangle(p, a, c, d,tempResult);
      this.q.set1(tempResult.closestPointOnSimplex);
      //convert result bitmask
      this.tmp.sub2(this.q, p);
      var sqDist = this.tmp.dot(this.tmp);
      if (sqDist < bestSqDist) {
        bestSqDist = sqDist;
        finalResult.closestPointOnSimplex.set1(this.q);
        finalResult.usedVertices.reset();
        finalResult.usedVertices.usedVertexA = tempResult.usedVertices.usedVertexA;
        
        finalResult.usedVertices.usedVertexC = tempResult.usedVertices.usedVertexB;
        finalResult.usedVertices.usedVertexD = tempResult.usedVertices.usedVertexC;
        finalResult.setBarycentricCoordinates(
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTA],
          0,
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTB],
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTC]
        );
      }
    }
    // Repeat test for face adb
    if (pointOutsideADB != 0) {
      this.closestPtPointTriangle(p, a, d, b,tempResult);
      this.q.set1(tempResult.closestPointOnSimplex);
      //convert result bitmask!
        
      this.tmp.sub2(this.q, p);
      var sqDist = this.tmp.dot(this.tmp);
      if (sqDist < bestSqDist) {
        bestSqDist = sqDist;
        finalResult.closestPointOnSimplex.set1(this.q);
        finalResult.usedVertices.reset();
        finalResult.usedVertices.usedVertexA = tempResult.usedVertices.usedVertexA;
        finalResult.usedVertices.usedVertexB = tempResult.usedVertices.usedVertexC;
       
        finalResult.usedVertices.usedVertexD = tempResult.usedVertices.usedVertexB;
        finalResult.setBarycentricCoordinates(
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTA],
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTC],
          0,
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTB]
        );
      }
    }
    // Repeat test for face bdc
    if (pointOutsideBDC != 0) {
      this.closestPtPointTriangle(p, b, d, c,tempResult);
      this.q.set1(tempResult.closestPointOnSimplex);
      //convert result bitmask!
      this.tmp.sub2(this.q,p);
      var sqDist = this.tmp.dot(this.tmp);
      if (sqDist < bestSqDist) {
        bestSqDist = sqDist;
        finalResult.closestPointOnSimplex.set1(this.q);
        finalResult.usedVertices.reset();
        //
        finalResult.usedVertices.usedVertexB = tempResult.usedVertices.usedVertexA;
        finalResult.usedVertices.usedVertexC = tempResult.usedVertices.usedVertexC;
        finalResult.usedVertices.usedVertexD = tempResult.usedVertices.usedVertexB;
        
        finalResult.setBarycentricCoordinates(
          0,
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTA],
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTC],
          tempResult.barycentricCoords[Bullet.SimplexSolver.VERTB]
        );
      }
    }
    //help! we ended up full !
    if (finalResult.usedVertices.usedVertexA &&
      finalResult.usedVertices.usedVertexB &&
      finalResult.usedVertices.usedVertexC &&
    finalResult.usedVertices.usedVertexD) {
      return true;
    }
        
    return true;
    } finally {
      this.subsimplexResultsPool.release(tempResult);
    }
  }
  Bullet.SimplexSolver.prototype.reset=function() {
    this.cachedValidClosest = false;
    this.numVertices = 0;
    this.needsUpdate = true;
    this.lastW.set3(1e30,1e30,1e30);
    this.cachedBC.reset();
  }
  Bullet.SimplexSolver.prototype.addVertex=function(w,p,q) {
    this.lastW.set1(w);
    this.needsUpdate = true;
    this.simplexVectorW[this.numVertices].set1(w);
    this.simplexPointsP[this.numVertices].set1(p);
    this.simplexPointsQ[this.numVertices].set1(q);
    this.numVertices++;
  }
  Bullet.SimplexSolver.prototype.closest=function(v) {
    var succes = this.updateClosestVectorAndPoints();
    v.set1(this.cachedV);
    //if (Bullet.dbg) ullet.log("ss numVertices="+this.numVertices+" cachedV="+this.cachedV);
    return succes;
  }
  Bullet.SimplexSolver.prototype.fullSimplex=function() {
    return (this.numVertices == 4);
  }
  Bullet.SimplexSolver.prototype.inSimplex=function(w) {
    var found = false;
    var i, numverts = this.numVertices;
    
    //w is in the current (reduced) simplex
    for (i = 0; i < numverts; i++) {
      if (this.simplexVectorW[i].equals(w)) {
        found = true;
      }
    }
        
    //check in case lastW is already removed
    if (w.equals(this.lastW)) {
      return true;
    }
        
    return found;
  }
  Bullet.SimplexSolver.prototype.backup_closest=function(v) {
    v.set1(this.cachedV);
  }
  Bullet.SimplexSolver.prototype.compute_points=function(p1,p2) {
    this.updateClosestVectorAndPoints();
    p1.set1(this.cachedP1);
    p2.set1(this.cachedP2);
  }
  Bullet.ResultsStatus= {
    Separated:0,
    Penetrating:1,
    GJK_Failed:2,
    EPA_Failed:3};
  Bullet.Results=function() {
    this.witnesses=[new Vecmath.Vec3(),new Vecmath.Vec3()];
    this.normal=new Vecmath.Vec3();
  }
  Bullet.Results.prototype.depth=0;
  Bullet.Results.prototype.epa_iterations=0;
  Bullet.Results.prototype.gjk_iterations=0;
  Bullet.Mkv=function() {
    this.w=new Vecmath.Vec3();
    this.r=new Vecmath.Vec3();
  }
  Bullet.Mkv.prototype.set=function(m) {
    this.w.set1(m.w);
    this.r.set1(m.r);
  }
  Bullet.He=function() {
    this.v=new Vecmath.Vec3();
  }
  Bullet.GJK=function(slvr) {
    this.table=new Array(Bullet.GJK.GJK_hashsize);
    this.wrotations=[new Vecmath.Mat3(),new Vecmath.Mat3()];
    this.positions=[new Vecmath.Vec3(),new Vecmath.Vec3()];
    this.shapes = new Array(2);
    this.simplex = new Array(5);
    this.ray = new Vecmath.Vec3();
    this.tmp=new Vecmath.Vec3();
    this.tmp1=new Vecmath.Vec3();
    this.tmp2=new Vecmath.Vec3();
    this.tmp_=new Vecmath.Vec3();
    this.cabo=new Vecmath.Vec3();
    this.tmps=new Vecmath.Vec3();
    this.tmp2s=new Vecmath.Vec3();
    this.crs=new Vecmath.Vec3();
    this.tmp3=new Vecmath.Vec3();
    this.tso=new Vecmath.Vec3();
    this.tso1=new Vecmath.Vec3();
    this.tso2=new Vecmath.Vec3();
    this.tso3=new Vecmath.Vec3();
    this.tso4=new Vecmath.Vec3();
    this.eo=new Vecmath.Vec3();
    this.eo1=new Vecmath.Vec3();
    this.eo2=new Vecmath.Vec3();
    this.ab=new Vecmath.Vec3();
    this.w=new Vecmath.Vec3();
    this.n=new Vecmath.Vec3();
    this.b = [new Vecmath.Vec3(),new Vecmath.Vec3(),new Vecmath.Vec3()];
    this.tmpQuat=new Vecmath.Quat4();
    this.r=new Vecmath.Mat3();
    this.slvr=slvr;
    for (var i=0; i<this.simplex.length; i++) this.simplex[i] = new Bullet.Mkv();
  }
  Bullet.GJK.GJK_hashsize=1<<6;
  Bullet.GJK.prototype.order=0;
  Bullet.GJK.prototype.iterations=0;
  Bullet.GJK.prototype.margin=0;
  Bullet.GJK.prototype.failed=false;
  Bullet.GJK.prototype.init=function(wrot0,pos0,shape0,wrot1,pos1,shape1,pmargin) {
    this.slvr.pushStack();
    this.wrotations[0].set1(wrot0);
    this.positions[0].set1(pos0);
    this.shapes[0] = shape0;
    this.wrotations[1].set1(wrot1);
    this.positions[1].set1(pos1);
    this.shapes[1] = shape1;
    this.margin = pmargin;
    this.failed = false;
  }
  Bullet.GJK.prototype.destroy=function() {
    this.slvr.popStack();
  }
  // vdh: very dummy hash
  Bullet.GJK.prototype.Hash=function(v) {
    var h = Math.floor(v.x * 15461) ^ Math.floor(v.y * 83003) ^ Math.floor(v.z * 15473);
    return (h * 169639) & Bullet.GjkEpaSolver.GJK_hashmask;
  }
  Bullet.GJK.prototype.LocalSupport=function(d,i,out) {
    this.tmp.set3(0,0,0);
    Bullet.MatrixUtil.transposeTransform(this.tmp, d,this.wrotations[i]);
    this.shapes[i].localGetSupportingVertex(this.tmp, out);
    this.wrotations[i].transform1(out);
    out.add1(this.positions[i]);
    return out;
  }
  Bullet.GJK.prototype.Support=function(d,v) {
    v.r.set1(d);
    this.tmp1.set3(0,0,0);this.tmp1 = this.LocalSupport(d, 0,this.tmp1);//Vector3f tmp1 = LocalSupport(d, 0, Stack._alloc(Vector3f.class));
    
    var tmp = this.tmp_;//Stack._alloc(Vector3f.class);
    tmp.set1(d);
    tmp.negate0();
    this.tmp2.set3(0,0,0);this.tmp2 = this.LocalSupport(tmp, 1,this.tmp2);//Vector3f tmp2 = LocalSupport(tmp, 1, Stack._alloc(Vector3f.class));
    v.w.sub2(this.tmp1, this.tmp2);
    v.w.scaleAdd(this.margin, d, v.w);
  }
  Bullet.GJK.prototype.FetchSupport=function() {
    var h = this.Hash(this.ray);
    var e = this.table[h];
    while (e != null) {
      if (e.v.equals(this.ray)) {
        --this.order;
        return false;
      } else {
        e = e.n;
      }
    }
    
    e = this.slvr.stackHe.get();
    e.v.set1(this.ray);
    e.n = this.table[h];
    this.table[h] = e;
    this.Support(this.ray, this.simplex[++this.order]);
    return (this.ray.dot(this.simplex[this.order].w) > 0);
  }
  Bullet.GJK.prototype.SolveSimplex2=function(ao,ab) {
    if (ab.dot(ao) >= 0) {
      this.cabo.set3(0,0,0);//Vector3f cabo = Stack._alloc(Vector3f.class);
      this.cabo.cross(ab, ao);
      if (this.cabo.lengthSquared() > Bullet.GjkEpaSolver.GJK_sqinsimplex_eps) {
        this.ray.cross(this.cabo, ab);
      } else {
        return true;
      }
    } else {
      this.order = 0;
      this.simplex[0].set(this.simplex[1]);
      this.ray.set1(ao);
    }
    return (false);
  }
  Bullet.GJK.prototype.SolveSimplex3=function(ao,ab,ac) {
    this.tmp.set3(0,0,0);
    this.tmp.cross(ab, ac);
    return (this.SolveSimplex3a(ao,ab,ac,this.tmp));
  }
  Bullet.GJK.prototype.SolveSimplex3a=function(ao,ab,ac,cabc) {
    // TODO: optimize
    var tmp=this.tmps;tmp.set3(0,0,0);
    tmp.cross(cabc, ab);
        
    var tmp2=this.tmp2s;tmp2.set3(0,0,0);
    tmp2.cross(cabc, ac);
        
    if (tmp.dot(ao) < -Bullet.GjkEpaSolver.GJK_insimplex_eps) {
      this.order = 1;
      this.simplex[0].set(this.simplex[1]);
      this.simplex[1].set(this.simplex[2]);
      return this.SolveSimplex2(ao, ab);
    } else if (tmp2.dot(ao) > +Bullet.GjkEpaSolver.GJK_insimplex_eps) {
      this.order = 1;
      this.simplex[1].set(this.simplex[2]);
      return this.SolveSimplex2(ao, ac);
    } else {
      var d = cabc.dot(ao);
      if (Math.abs(d) > Bullet.GjkEpaSolver.GJK_insimplex_eps) {
        if (d > 0) {
          this.ray.set1(cabc);
        } else {
          this.ray.negate1(cabc);
          var swapTmp = new Bullet.Mkv();
          swapTmp.set(this.simplex[0]);
          this.simplex[0].set(this.simplex[1]);
          this.simplex[1].set(swapTmp);
        }
        return false;
      } else {
        return true;
      }
    }
  }
  Bullet.GJK.prototype.SolveSimplex4=function(ao,ab,ac,ad) {
    // TODO: optimize
    this.crs.set3(0,0,0);
    this.tmp.set3(0,0,0);
    this.tmp.cross(ab, ac);
    this.tmp2.set3(0,0,0);
    this.tmp2.cross(ac, ad);
    this.tmp3.set3(0,0,0);
    this.tmp3.cross(ad, ab);
        
    if (this.tmp.dot(ao) > Bullet.GjkEpaSolver.GJK_insimplex_eps) {
      this.crs.set1(this.tmp);
      this.order = 2;
      this.simplex[0].set(this.simplex[1]);
      this.simplex[1].set(this.simplex[2]);
      this.simplex[2].set(this.simplex[3]);
      return this.SolveSimplex3a(ao, ab, ac, this.crs);
    } else if (this.tmp2.dot(ao) > Bullet.GjkEpaSolver.GJK_insimplex_eps) {
      this.crs.set1(this.tmp2);
      this.order = 2;
      this.simplex[2].set(this.simplex[3]);
      return this.SolveSimplex3a(ao, ac, ad, this.crs);
    } else if (this.tmp3.dot(ao) > Bullet.GjkEpaSolver.GJK_insimplex_eps) {
      this.crs.set1(this.tmp3);
      this.order = 2;
      this.simplex[1].set(this.simplex[0]);
      this.simplex[0].set(this.simplex[2]);
      this.simplex[2].set(this.simplex[3]);
      return this.SolveSimplex3a(ao, ad, ab, this.crs);
    } else {
      return (true);
    }
  }
  Bullet.GJK.prototype.SearchOrigin=function() {
    //pl maybe tso not needed..
    var tmp=this.tso;
    tmp.set3(1,0,0);
    return this.SearchOrigin1(tmp);
  }
  Bullet.GJK.prototype.SearchOrigin1=function(initray) {
    var tmp1 =this.tso1;tmp1.set3(0,0,0);// Stack._alloc(Vector3f.class);
    var tmp2 =this.tso2;tmp2.set3(0,0,0);// Stack._alloc(Vector3f.class);
    var tmp3 =this.tso3;tmp3.set3(0,0,0);// Stack._alloc(Vector3f.class);
    var tmp4 =this.tso4;tmp4.set3(0,0,0);// Stack._alloc(Vector3f.class);
        
    this.iterations = 0;
    this.order = -1;
    this.failed = false;
    this.ray.set1(initray);
    this.ray.normalize();
    
    Bullet.arrayFill(this.table, null);
    this.FetchSupport();
    this.ray.negate1(this.simplex[0].w);
    for (; this.iterations < Bullet.GjkEpaSolver.GJK_maxiterations; ++this.iterations) {
      var rl = this.ray.length();
      this.ray.scale1(1 / (rl > 0 ? rl : 1));
      if (this.FetchSupport()) {
        var found = false;
    switch (this.order) {
      case 1: {
      tmp1.negate1(this.simplex[1].w);
      tmp2.sub2(this.simplex[0].w, this.simplex[1].w);
      found = this.SolveSimplex2(tmp1, tmp2);
      break;
      }
      case 2: {
      tmp1.negate1(this.simplex[2].w);
      tmp2.sub2(this.simplex[1].w, this.simplex[2].w);
      tmp3.sub2(this.simplex[0].w, this.simplex[2].w);
      found = this.SolveSimplex3(tmp1, tmp2, tmp3);
      break;
      }
      case 3: {
      tmp1.negate1(this.simplex[3].w);
      tmp2.sub2(this.simplex[2].w, this.simplex[3].w);
      tmp3.sub2(this.simplex[1].w, this.simplex[3].w);
      tmp4.sub2(this.simplex[0].w, this.simplex[3].w);
      found = this.SolveSimplex4(tmp1, tmp2, tmp3, tmp4);
      break;
      }
    }
        if (found) {
          return true;
        }
      } else {
        return false;
      }
    }
    this.failed = true;
    return false;
  }
  Bullet.GJK.prototype.EncloseOrigin=function() {
    var tmp =this.eo;tmp.set3(0,0,0);// Stack._alloc(Vector3f.class);
    var tmp1 =this.eo1;tmp1.set3(0,0,0);// Stack._alloc(Vector3f.class);
    var tmp2 =this.eo2;tmp2.set3(0,0,0);// Stack._alloc(Vector3f.class);
    switch (this.order) {
      // Point
      case 0:
      break;
      // Line
      case 1:
      //...pl-del
      break;
      // Triangle
      case 2: {
      tmp1.sub2(this.simplex[1].w,this.simplex[0].w);
      tmp2.sub2(this.simplex[2].w, this.simplex[0].w);
      this.n.set3(0,0,0);//Vector3f n = Stack.lloc(Vector3f.class);
      this.n.cross(tmp1, tmp2);
      this.n.normalize();
      this.Support(this.n,this.simplex[3]);
          
      tmp.negate1(this.n);
      this.Support(tmp, this.simplex[4]);
      this.order = 4;
      return (true);
      }
      // Tetrahedron
      case 3:
      return (true);
      // Hexahedron
      case 4:
      return (true);
    }
    return (false);
  }
  Bullet.Face=function() {
    this.v=new Array(3);
    this.f=new Array(3);
    this.e=new Array(3);
    this.n=new Vecmath.Vec3();
  }
  Bullet.Face.prototype.d=0;
  Bullet.Face.prototype.mark=0;
  Bullet.EPA=function(pgjk,slvr) {
    this.features=[[new Vecmath.Vec3(),new Vecmath.Vec3(),new Vecmath.Vec3()],[new Vecmath.Vec3(),new Vecmath.Vec3(),new Vecmath.Vec3()]];
    this.nearest=[new Vecmath.Vec3(),new Vecmath.Vec3()];
    this.normal=new Vecmath.Vec3();
    this.tmp=new Vecmath.Vec3();
    this.tmp1=new Vecmath.Vec3();
    this.tmp2=new Vecmath.Vec3();
    this.o=new Vecmath.Vec3();
    this.tmp3=new Vecmath.Vec3();
    this.nrm=new Vecmath.Vec3();
    this.b=new Vecmath.Vec3();
    this.gjk=pgjk;
    this.slvr=slvr;
  }
  Bullet.EPA.prototype.nfaces=0;
  Bullet.EPA.prototype.iterations=0;
  Bullet.EPA.prototype.depth=0;
  Bullet.EPA.prototype.failed=false;
  Bullet.EPA.prototype.GetCoordinates=function(face,out) {
    this.tmp.set3(0,0,0);//Vector3f tmp = Stack._alloc(Vector3f.class);
    this.tmp1.set3(0,0,0);//Vector3f tmp1 = Stack._alloc(Vector3f.class);
    this.tmp2.set3(0,0,0);//Vector3f tmp2 = Stack._alloc(Vector3f.class);
        
    this.o.set3(0,0,0);//Vector3f o = Stack._alloc(Vector3f.class);
    this.o.scale2(-face.d, face.n);
        
    var a = this.slvr.floatArrays.getFixed(3);
        
    this.tmp1.sub2(face.v[0].w, this.o);
    this.tmp2.sub2(face.v[1].w, this.o);
    this.tmp.cross(this.tmp1, this.tmp2);
    a[0] = this.tmp.length();
        
    this.tmp1.sub2(face.v[1].w, this.o);
    this.tmp2.sub2(face.v[2].w, this.o);
    this.tmp.cross(this.tmp1, this.tmp2);
    a[1] = this.tmp.length();
        
    this.tmp1.sub2(face.v[2].w, this.o);
    this.tmp2.sub2(face.v[0].w, this.o);
    this.tmp.cross(this.tmp1, this.tmp2);
    a[2] = this.tmp.length();
        
    var sm = a[0] + a[1] + a[2];
        
    out.set3(a[1], a[2], a[0]);
    out.scale1(1 / (sm > 0 ? sm : 1));
        
    this.slvr.floatArrays.release(a);
    return out;
  }
  Bullet.EPA.prototype.FindBest=function() {
    var bf = null;
    if (this.root != null) {
      var cf = this.root;
      var bd = Bullet.GjkEpaSolver.cstInf;
      do {
        if (cf.d < bd) {
          bd = cf.d;
          bf = cf;
        }
      } while (null != (cf = cf.next));
    }
    return bf;
  }
  Bullet.EPA.prototype.Set=function(f,a,b,c) {
    this.tmp1.set3(0,0,0);//Vector3f tmp1 = Stack._alloc(Vector3f.class);
    this.tmp2.set3(0,0,0);//Vector3f tmp2 = Stack._alloc(Vector3f.class);
    this.tmp3.set3(0,0,0);//Vector3f tmp3 = Stack._alloc(Vector3f.class);
        
    this.nrm.set3(0,0,0);//Vector3f nrm = Stack._alloc(Vector3f.class);
    this.tmp1.sub2(b.w, a.w);
    this.tmp2.sub2(c.w, a.w);
    this.nrm.cross(this.tmp1, this.tmp2);
        
    var len = this.nrm.length();
        
    this.tmp1.cross(a.w, b.w);
    this.tmp2.cross(b.w, c.w);
    this.tmp3.cross(c.w, a.w);
        
    var valid = (this.tmp1.dot(this.nrm) >= -Bullet.GjkEpaSolver.EPA_inface_eps) &&
      (this.tmp2.dot(this.nrm) >= -Bullet.GjkEpaSolver.EPA_inface_eps) &&
      (this.tmp3.dot(this.nrm) >= -Bullet.GjkEpaSolver.EPA_inface_eps);
        
    f.v[0] = a;
    f.v[1] = b;
    f.v[2] = c;
    f.mark = 0;
    f.n.scale2(1 / (len > 0 ? len : Bullet.GjkEpaSolver.cstInf), this.nrm);
    f.d = Math.max(0, -f.n.dot(a.w));
    return valid;
  }
  Bullet.EPA.prototype.NewFace=function(a,b,c) {
    var pf = this.slvr.stackFace.get();
    if (this.Set(pf, a, b, c)) {
      if (this.root != null) {
        this.root.prev = pf;
      }
      pf.prev = null;
      pf.next = this.root;
      this.root = pf;
      ++this.nfaces;
    } else {
      pf.prev = pf.next = null;
    }
    return (pf);
  }
  Bullet.EPA.prototype.Detach=function(face) {
    if (face.prev != null || face.next != null) {
      --this.nfaces;
      if (face == this.root) {
        this.root = face.next;
        this.root.prev = null;
      } else {
        if (face.next == null) {
          face.prev.next = null;
        } else {
          face.prev.next = face.next;
          face.next.prev = face.prev;
        }
      }
      face.prev = face.next = null;
    }
  }
  Bullet.EPA.prototype.Link=function(f0,e0,f1,e1) {
    f0.f[e0] = f1; f1.e[e1] = e0;
    f1.f[e1] = f0; f0.e[e0] = e1;
  }
  Bullet.EPA.prototype.Support=function(w) {
    var v = this.slvr.stackMkv.get();
    this.gjk.Support(w, v);
    return v;
  }
  Bullet.EPA.prototype.BuildHorizon=function(markid,w,f,e,cf,ff) {
    var ne = 0;
    if (f.mark != markid) {
      var e1 = Bullet.GjkEpaSolver.mod3[e + 1];
      if ((f.n.dot(w.w) + f.d) > 0) {
        var nf = this.NewFace(f.v[e1], f.v[e], w);
        this.Link(nf, 0, f, e);
        if (cf[0] != null) {
          this.Link(cf[0], 1, nf, 2);
        } else {
          ff[0] = nf;
        }
        cf[0] = nf;
        ne = 1;
      } else {
        var e2 = Bullet.GjkEpaSolver.mod3[e + 2];
        this.Detach(f);
        f.mark = markid;
        ne += this.BuildHorizon(markid, w, f.f[e1], f.e[e1], cf, ff);
        ne += this.BuildHorizon(markid, w, f.f[e2], f.e[e2], cf, ff);
      }
    }
    return (ne);
  }
  Bullet.EPA.prototype.EvaluatePD0=function() {
    return this.EvaluatePD1(Bullet.GjkEpaSolver.EPA_accuracy)
  }
  Bullet.EPA.prototype.EvaluatePD1=function(accuracy) {
    this.slvr.pushStack();
    try {
      this.tmp.set3(0,0,0);//Vector3f tmp = Stack._alloc(Vector3f.class);
      var bestface = null;
      var markid = 1;
      this.depth = -Bullet.GjkEpaSolver.cstInf;
      this.normal.set3(0,0,0);
      this.root = null;
      this.nfaces = 0;
      this.iterations = 0;
      this.failed = false;
      if (this.gjk.EncloseOrigin()) {
        var pfidx_ptr = null;
        var pfidx_index = 0;
        var nfidx = 0;
        var peidx_ptr = null;
        var peidx_index = 0;
        var neidx = 0;
        var basemkv = new Array(5);
        var basefaces = new Array(6);
    switch (this.gjk.order) {
      // Tetrahedron
      case 3:
      {
      pfidx_ptr = Bullet.GjkEpaSolver.tetrahedron_fidx;
      pfidx_index = 0;
      
      nfidx = 4;
      
      peidx_ptr = Bullet.GjkEpaSolver.tetrahedron_eidx;
      peidx_index = 0;
      
      neidx = 6;
      }
      break;
      // Hexahedron
      case 4:
      {
      pfidx_ptr = Bullet.GjkEpaSolver.hexahedron_fidx;
      pfidx_index = 0;
      
      nfidx = 6;
      
      peidx_ptr = Bullet.GjkEpaSolver.hexahedron_eidx;
      peidx_index = 0;
      
      neidx = 9;
      }
      break;
    }
        var i;
        
        for (i = 0; i <= this.gjk.order; ++i) {
          basemkv[i] = new Bullet.Mkv();
          basemkv[i].set(this.gjk.simplex[i]);
        }
        for (i = 0; i < nfidx; ++i, pfidx_index++) {
          basefaces[i] = this.NewFace(basemkv[pfidx_ptr[pfidx_index][0]], basemkv[pfidx_ptr[pfidx_index][1]], basemkv[pfidx_ptr[pfidx_index][2]]);
        }
        for (i = 0; i < neidx; ++i, peidx_index++) {
          this.Link(basefaces[peidx_ptr[peidx_index][0]], peidx_ptr[peidx_index][1], basefaces[peidx_ptr[peidx_index][2]], peidx_ptr[peidx_index][3]);
        }
      }
      if (0 == this.nfaces) {
        return (this.depth);
      }
      for (; this.iterations < Bullet.GjkEpaSolver.EPA_maxiterations; ++this.iterations) {
        var bf = this.FindBest();
        if (bf != null) {
          this.tmp.negate1(bf.n);
          var w = this.Support(this.tmp);
          var d = bf.n.dot(w.w) + bf.d;
          bestface = bf;
          if (d < -accuracy) {
            var cf = [null];
            var ff = [null];
            var nf = 0;
            this.Detach(bf);
            bf.mark = ++markid;
            for (var i = 0; i < 3; ++i) {
              nf += this.BuildHorizon(markid, w, bf.f[i], bf.e[i], cf, ff);
            }
            if (nf <= 2) {
              break;
            }
            this.Link(cf[0], 1, ff[0], 2);
          } else {
            break;
          }
        } else {
          break;
        }
      }
      if (bestface != null) {
        this.b.set3(0,0,0);this.b=this.GetCoordinates(bestface,this.b);//Vector3f b = GetCoordinates(bestface, Stack.a_lloc(Vector3f.class));
        this.normal.set1(bestface.n);
        this.depth = Math.max(0, bestface.d);
        for (var i = 0; i < 2; ++i) {
          var s = i != 0 ? -1 : 1;
          for (var j = 0; j < 3; ++j) {
            this.tmp.scale2(s, bestface.v[j].r);
            this.gjk.LocalSupport(this.tmp,i,this.features[i][j]);
          }
        }
        
        this.tmp1.set3(0,0,0);//Vector3f tmp1 = Stack._alloc(Vector3f.class);
        this.tmp2.set3(0,0,0);//Vector3f tmp2 = Stack._alloc(Vector3f.class);
        this.tmp3.set3(0,0,0);//Vector3f tmp3 = Stack._alloc(Vector3f.class);
        
        this.tmp1.scale2(this.b.x,this.features[0][0]);
        this.tmp2.scale2(this.b.y,this.features[0][1]);
        this.tmp3.scale2(this.b.z,this.features[0][2]);
        Bullet.VectorUtil.add(this.nearest[0], this.tmp1, this.tmp2, this.tmp3);
        
        this.tmp1.scale2(this.b.x,this.features[1][0]);
        this.tmp2.scale2(this.b.y,this.features[1][1]);
        this.tmp3.scale2(this.b.z,this.features[1][2]);
        Bullet.VectorUtil.add(this.nearest[1], this.tmp1, this.tmp2, this.tmp3);
      } else {
        this.failed = true;
      }
      return (this.depth);
    } finally {
      this.slvr.popStack();
    }
  }
  Bullet.floatArrayPool=new Bullet.ArrayPool();
  Bullet.GjkEpaSolver=function() {
    this.gjk=new Bullet.GJK(this);
  }
  Bullet.GjkEpaSolver.GJK_hashsize=4;
  Bullet.GjkEpaSolver.prototype.floatArrays=Bullet.floatArrayPool;
  Bullet.GjkEpaSolver.prototype.stackMkv=new Bullet.ObjectStackList(function() {
    return new Bullet.Mkv();
  }
  );
  Bullet.GjkEpaSolver.prototype.stackHe=new Bullet.ObjectStackList(function() {
    return new Bullet.He();
  }
  );
  Bullet.GjkEpaSolver.prototype.stackFace=new Bullet.ObjectStackList(function() {
    return new Bullet.Face();
  }
  );
  Bullet.GjkEpaSolver.prototype.pushStack=function() {
    this.stackMkv.push();
    this.stackHe.push();
    this.stackFace.push();
  }
  Bullet.GjkEpaSolver.prototype.popStack=function() {
    this.stackMkv.pop();
    this.stackHe.pop();
    this.stackFace.pop();
  }
  Bullet.GjkEpaSolver.cstInf = Bullet.BulletGlobals.SIMD_INFINITY;
  Bullet.GjkEpaSolver.cstPi = Bullet.BulletGlobals.SIMD_PI;
  Bullet.GjkEpaSolver.cst2Pi = Bullet.BulletGlobals.SIMD_2_PI;
  Bullet.GjkEpaSolver.GJK_maxiterations = 128;
  Bullet.GjkEpaSolver.GJK_hashsize = 1 << 6;
  Bullet.GjkEpaSolver.GJK_hashmask = Bullet.GjkEpaSolver.GJK_hashsize - 1;
  Bullet.GjkEpaSolver.GJK_insimplex_eps = 0.0001;
  Bullet.GjkEpaSolver.GJK_sqinsimplex_eps = Bullet.GjkEpaSolver.GJK_insimplex_eps * Bullet.GjkEpaSolver.GJK_insimplex_eps;
  Bullet.GjkEpaSolver.EPA_maxiterations = 256;
  Bullet.GjkEpaSolver.EPA_inface_eps = 0.01;
  Bullet.GjkEpaSolver.EPA_accuracy = 0.001;
  Bullet.GjkEpaSolver.mod3 = [ 0, 1, 2, 0, 1 ];
  Bullet.GjkEpaSolver.tetrahedron_fidx=[[2,1,0],[3,0,1],[3,1,2],[3,2,0]];
  Bullet.GjkEpaSolver.tetrahedron_eidx=[[0,0,2,1],[0,1,1,1],[0,2,3,1],[1,0,3,2],[2,0,1,2],[3,0,2,2]];
  Bullet.GjkEpaSolver.hexahedron_fidx=[[2,0,4],[4,1,2],[1,4,0],[0,3,1],[0,2,3],[1,3,2]];
  Bullet.GjkEpaSolver.hexahedron_eidx=[[0,0,4,0],[0,1,2,1],[0,2,1,2],[1,1,5,2],[1,0,2,0],[2,2,3,2],[3,1,5,0],[3,0,4,2],[5,1,4,1]];
  Bullet.GjkEpaSolver.prototype.collide=function(shape0,wtrs0,shape1,wtrs1,radialmargin,results) {
    results.witnesses[0].set3(0,0,0);
    results.witnesses[1].set3(0,0,0);
    results.normal.set3(0,0,0);
    results.depth = 0;
    results.status = Bullet.ResultsStatus.Separated;
    results.epa_iterations = 0;
    results.gjk_iterations = 0;
    this.gjk.init(
      wtrs0.basis, wtrs0.origin, shape0,
      wtrs1.basis, wtrs1.origin, shape1,
      radialmargin + Bullet.GjkEpaSolver.EPA_accuracy);
    try {
      var collide = this.gjk.SearchOrigin();
      results.gjk_iterations = this.gjk.iterations + 1;
      if (collide) {
        // Then EPA for penetration depth
        var epa = new Bullet.EPA(this.gjk,this);
        var pd = epa.EvaluatePD0();
        results.epa_iterations = epa.iterations + 1;
        if (pd > 0) {
          results.status = Bullet.ResultsStatus.Penetrating;
          results.normal.set1(epa.normal);
          results.depth = pd;
          results.witnesses[0].set1(epa.nearest[0]);
          results.witnesses[1].set1(epa.nearest[1]);
          return (true);
        } else {
          if (epa.failed) {
            results.status = Bullet.ResultsStatus.EPA_Failed;
          }
        }
      } else {
        if (this.gjk.failed) {
          results.status = Bullet.ResultsStatus.GJK_Failed;
        }
      }
      return (false);
    } finally {
      this.gjk.destroy();
    }
  }
  Bullet.GjkEpaPenetrationDepthSolver=function() {
    this.gjkEpaSolver = new Bullet.GjkEpaSolver();
  }
  Bullet.GjkEpaPenetrationDepthSolver.prototype.calcPenDepth=function(simplexSolver,pConvexA,pConvexB,transformA,transformB,v,wWitnessOnA,wWitnessOnB) {
    var radialmargin = 0;
    var results = new Bullet.Results();
    if (this.gjkEpaSolver.collide(pConvexA, transformA,pConvexB, transformB,radialmargin, results)) {
      wWitnessOnA.set1(results.witnesses[0]);
      wWitnessOnB.set1(results.witnesses[1]);
      return true;
    }
    return false;
  }
  Bullet.GjkPairDetector=function() {
    this.cachedSeparatingAxis=new Vecmath.Vec3();
    this.tmp=new Vecmath.Vec3();
    this.normalInB=new Vecmath.Vec3();
    this.pointOnA=new Vecmath.Vec3();
    this.pointOnB=new Vecmath.Vec3();
    this.positionOffset=new Vecmath.Vec3();
    this.seperatingAxisInA=new Vecmath.Vec3();
    this.seperatingAxisInB=new Vecmath.Vec3();
    this.pInA=new Vecmath.Vec3();
    this.qInB=new Vecmath.Vec3();
    this.pWorld=new Vecmath.Vec3();
    this.qWorld=new Vecmath.Vec3();
    this.w=new Vecmath.Vec3();
    this.tmpPointOnA=new Vecmath.Vec3();
    this.tmpPointOnB=new Vecmath.Vec3();
    this.tmpNormalInB=new Vecmath.Vec3();
    this.localTransA=new Bullet.Transform();
    this.localTransB=new Bullet.Transform();
  }
  Bullet.GjkPairDetector.REL_ERROR2 = 1.0e-6;
  Bullet.GjkPairDetector.prototype.ignoreMargin=false;
  Bullet.GjkPairDetector.prototype.lastUsedMethod=0;
  Bullet.GjkPairDetector.prototype.curIter=0;
  Bullet.GjkPairDetector.prototype.degenerateSimplex=0;
  Bullet.GjkPairDetector.prototype.catchDegeneracies=0;
  Bullet.GjkPairDetector.prototype.init=function(objectA,objectB,simplexSolver,penetrationDepthSolver) {
    this.cachedSeparatingAxis.set3(0, 0, 1);
    this.ignoreMargin = false;
    this.lastUsedMethod = -1;
    this.catchDegeneracies = 1;
        
    this.penetrationDepthSolver = penetrationDepthSolver;
    this.simplexSolver = simplexSolver;
    this.minkowskiA = objectA;
    this.minkowskiB = objectB;
  }
  Bullet.GjkPairDetector.prototype.getClosestPoints2=function(input,output) {
    this.getClosestPoints(input, output, false);
  }
  Bullet.GjkPairDetector.prototype.getClosestPoints=function(input,output,swapResults) {
    this.tmp.set3(0,0,0);//Vector3f tmp = Stack._alloc(Vector3f.class);
    
    //var dbg=(input.transformB.origin.y<-13)&(input.transformB.origin.y>-14);
    
    
    var distance = 0;
    this.normalInB.set3(0,0,0);//Vector3f normalInB = Stack._alloc(Vector3f.class);
    this.pointOnA.set3(0,0,0);this.pointOnB.set3(0,0,0);//Vector3f pointOnA = Stack._alloc(Vector3f.class), pointOnB = Stack._alloc(Vector3f.class);
    this.localTransA.setT(input.transformA);//Transform localTransA = Stack._alloc(input.transformA);
    this.localTransB.setT(input.transformB);//Transform localTransB = Stack._alloc(input.transformB);
    this.positionOffset.set3(0,0,0);//Vector3f positionOffset = Stack._alloc(Vector3f.class);
    this.positionOffset.add2(this.localTransA.origin, this.localTransB.origin);
    this.positionOffset.scale1(0.5);
    this.localTransA.origin.sub1(this.positionOffset);
    this.localTransB.origin.sub1(this.positionOffset);
    var marginA = this.minkowskiA.getMargin();
    var marginB = this.minkowskiB.getMargin();
    if (this.ignoreMargin) {
      marginA = 0;
      marginB = 0;
    }
       
    this.curIter = 0;
    var gGjkMaxIter = 1000; // this is to catch invalid input, perhaps check for #NaN?
    this.cachedSeparatingAxis.set3(0, 1, 0);
        
    var isValid = false;
    var checkSimplex = false;
    var checkPenetration = true;
    this.degenerateSimplex = 0;
    this.lastUsedMethod = -1;
       
    {
    var squaredDistance = Bullet.BulletGlobals.SIMD_INFINITY;
    var delta = 0;
    
    var margin = marginA + marginB;
    this.simplexSolver.reset();
    this.seperatingAxisInA.set3(0,0,0);//Vector3f seperatingAxisInA = Stack._alloc(Vector3f.class);
    this.seperatingAxisInB.set3(0,0,0);//Vector3f seperatingAxisInB = Stack._alloc(Vector3f.class);
        
    this.pInA.set3(0,0,0);//Vector3f pInA = Stack._alloc(Vector3f.class);
    this.qInB.set3(0,0,0);//Vector3f qInB = Stack._alloc(Vector3f.class);
        
    this.pWorld.set3(0,0,0);//Vector3f pWorld = Stack._alloc(Vector3f.class);
    this.qWorld.set3(0,0,0);//Vector3f qWorld = Stack._alloc(Vector3f.class);
    this.w.set3(0,0,0);//Vector3f w = Stack._alloc(Vector3f.class);
        
    this.tmpPointOnA.set3(0,0,0);this.tmpPointOnB.set3(0,0,0);//Vector3f tmpPointOnA = Stack._alloc(Vector3f.class), tmpPointOnB = Stack._alloc(Vector3f.class);
    this.tmpNormalInB.set3(0,0,0);//Vector3f tmpNormalInB = Stack._alloc(Vector3f.class);
        
     for (;;) //while (true)
        {
        this.seperatingAxisInA.negate1(this.cachedSeparatingAxis);
        Bullet.MatrixUtil.transposeTransform(this.seperatingAxisInA, this.seperatingAxisInA, input.transformA.basis);
        
        this.seperatingAxisInB.set1(this.cachedSeparatingAxis);
        Bullet.MatrixUtil.transposeTransform(this.seperatingAxisInB, this.seperatingAxisInB, input.transformB.basis);
        
        this.minkowskiA.localGetSupportingVertexWithoutMargin(this.seperatingAxisInA, this.pInA);
        this.minkowskiB.localGetSupportingVertexWithoutMargin(this.seperatingAxisInB, this.qInB);
        
        this.pWorld.set1(this.pInA);
        this.localTransA.transform(this.pWorld);
        
        this.qWorld.set1(this.qInB);
        this.localTransB.transform(this.qWorld);
        
        this.w.sub2(this.pWorld, this.qWorld);
        
        delta = this.cachedSeparatingAxis.dot(this.w);
        
        // potential exit, they don't overlap
        if ((delta > 0) && (delta * delta > squaredDistance * input.maximumDistanceSquared)) {
          checkPenetration = false;
          break;
        }
        
        // exit 0: the new point is already in the simplex, or we didn't come any closer
        if (this.simplexSolver.inSimplex(this.w)) {
          this.degenerateSimplex = 1;
          checkSimplex = true;
          break;
        }
        // are we getting any closer ?
        var f0 = squaredDistance - delta;
        var f1 = squaredDistance * Bullet.GjkPairDetector.REL_ERROR2;
        
        if (f0 <= f1) {
          if (f0 <= 0) {
            this.degenerateSimplex = 2;
          }
          checkSimplex = true;
          break;
        }
        // add current vertex to simplex
        this.simplexSolver.addVertex(this.w,this.pWorld,this.qWorld);
    
        // calculate the closest point to the origin (update vector v)
        if (!this.simplexSolver.closest(this.cachedSeparatingAxis)) {
          this.degenerateSimplex = 3;
          checkSimplex = true;
          break;
        }
        
        if (this.cachedSeparatingAxis.lengthSquared() < Bullet.GjkPairDetector.REL_ERROR2) {
          this.degenerateSimplex = 6;
          checkSimplex = true;
          break;
        }
        
        var previousSquaredDistance = squaredDistance;
        squaredDistance = this.cachedSeparatingAxis.lengthSquared();
        
        // redundant m_simplexSolver->compute_points(pointOnA, pointOnB);
        
        // are we getting any closer ?
        if (previousSquaredDistance - squaredDistance <= Bullet.BulletGlobals.FLT_EPSILON * previousSquaredDistance) {
          this.simplexSolver.backup_closest(this.cachedSeparatingAxis);
          checkSimplex = true;
          break;
        }
        
        // degeneracy, this is typically due to invalid/uninitialized worldtransforms for a CollisionObject   
        if (this.curIter++ > gGjkMaxIter) {  
          break;
        }
      
        var check = (!this.simplexSolver.fullSimplex());
        if (!check) {
          // do we need this backup_closest here ?
          this.simplexSolver.backup_closest(this.cachedSeparatingAxis);
          break;
        }
      }    
      if (checkSimplex) {
        this.simplexSolver.compute_points(this.pointOnA, this.pointOnB);
        this.normalInB.sub2(this.pointOnA, this.pointOnB);
        var lenSqr = this.cachedSeparatingAxis.lengthSquared();
        if (lenSqr < 0.0001) {
          this.degenerateSimplex = 5;
        }
        if (lenSqr > Bullet.BulletGlobals.FLT_EPSILON * Bullet.BulletGlobals.FLT_EPSILON) {//* Bullet.BulletGlobals.FLT_EPSILON* Bullet.BulletGlobals.FLT_EPSILON) {
          var rlen = 1/Math.sqrt(lenSqr);
          this.normalInB.scale1(rlen); // normalize
          var s = Math.sqrt(squaredDistance);
        
          this.tmp.scale2((marginA / s), this.cachedSeparatingAxis);
          this.pointOnA.sub1(this.tmp);
    
          this.tmp.scale2((marginB / s), this.cachedSeparatingAxis);
          this.pointOnB.add1(this.tmp);
        
          distance = ((1 / rlen) - margin);
          isValid = true;
        
          this.lastUsedMethod = 1;
        } else {
          this.lastUsedMethod = 2;
        }
      }
        
      var catchDegeneratePenetrationCase =
        (this.catchDegeneracies != 0 && this.penetrationDepthSolver != null && this.degenerateSimplex != 0 && ((distance + margin) < 0.01));
        
      if (checkPenetration && (!isValid || catchDegeneratePenetrationCase)) {
        // penetration case
        
        // if there is no way to handle penetrations, bail out
        if (this.penetrationDepthSolver != null) {
          // Penetration depth case.
          //BulletStats.gNumDeepPenetrationChecks++;
        
          var isValid2 = this.penetrationDepthSolver.calcPenDepth(this.simplexSolver,this.minkowskiA, this.minkowskiB,
            this.localTransA, this.localTransB,this.cachedSeparatingAxis, this.tmpPointOnA, this.tmpPointOnB);
       
          if (isValid2) {
            this.tmpNormalInB.sub2(this.tmpPointOnB,this.tmpPointOnA);
            var lenSqr = this.tmpNormalInB.lengthSquared();
            if (lenSqr > (Bullet.BulletGlobals.FLT_EPSILON * Bullet.BulletGlobals.FLT_EPSILON)) {
            this.tmpNormalInB.scale1(1 / Math.sqrt(lenSqr));
            this.tmp.sub2(this.tmpPointOnA,this.tmpPointOnB);
            var distance2 = -this.tmp.length();
            // only replace valid penetrations when the result is deeper (check)
            if (!isValid || (distance2 < distance)) {
              distance = distance2;
              this.pointOnA.set1(this.tmpPointOnA);
              this.pointOnB.set1(this.tmpPointOnB);
              this.normalInB.set1(this.tmpNormalInB);
              isValid = true;
              this.lastUsedMethod = 3;
            } else {
        
            }
          } else {
            //isValid = false;
            this.lastUsedMethod = 4;
          }
        } else {
          this.lastUsedMethod = 5;
        }
      }
    }
    }
        
    if (isValid) {
      this.tmp.add2(this.pointOnB,this.positionOffset);
      output.addContactPoint(this.normalInB,this.tmp,distance);
    }
  }
  Bullet.CollisionShape=function() {}
  Bullet.CollisionShape.prototype.userPointer=null;
  Bullet.CollisionShape.prototype.toString=function() {
    return "CollisionShape";
  }
  Bullet.ConvexShape=function() {}
  Bullet.ConvexShape.prototype=new Bullet.CollisionShape();
  Bullet.ConvexShape.MAX_PREFERRED_PENETRATION_DIRECTIONS = 10;
  Bullet.ConvexShape.prototype.toString=function() {
    return "ConvexShape";
  }
  Bullet.ConvexInternalShape=function() {}
  Bullet.ConvexInternalShape.prototype=new Bullet.ConvexShape();
  Bullet.ConvexInternalShape.prototype.collisionMargin = Bullet.BulletGlobals.CONVEX_DISTANCE_MARGIN;
  Bullet.ConvexInternalShape.prototype.getMargin=function() {
    return this.collisionMargin;
  }
  Bullet.ConvexInternalShape.prototype.toString=function() {
    return "ConvexInternalShape";
  }
  Bullet.BoxShape=function(boxHalfExtents) {
    this.margin=new Vecmath.Vec3();
    this.halfExtents=new Vecmath.Vec3();
    this.abs_b=new Vecmath.Mat3();
    this.tmp=new Vecmath.Vec3();
    this.center=new Vecmath.Vec3();
    this.extent=new Vecmath.Vec3();
    this.implicitShapeDimensions = new Vecmath.Vec3();
    var margin = new Vecmath.Vec3(this.getMargin(),this.getMargin(),this.getMargin());
    this.implicitShapeDimensions.set1(boxHalfExtents);
    this.implicitShapeDimensions.sub1(margin);
    //this.id=Bullet.objC++;
  }
  Bullet.BoxShape.prototype=new Bullet.ConvexInternalShape();
  Bullet.BoxShape.prototype.getHalfExtentsWithMargin=function(out) {
    var halfExtents = this.getHalfExtentsWithoutMargin(out);
    this.margin.set3(0,0,0);//Vector3f margin = Stack._alloc(Vector3f.class);
    this.margin.set3(this.getMargin(),this.getMargin(),this.getMargin());
    halfExtents.add1(this.margin);
    return out;
  }
  Bullet.BoxShape.prototype.getHalfExtentsWithoutMargin=function(out) {
    out.set1(this.implicitShapeDimensions); // changed in Bullet 2.63: assume the scaling and margin are included
    return out;
  }
  Bullet.BoxShape.prototype.getShapeType=function() {
    return Bullet.BroadphaseNativeType.BOX_SHAPE_PROXYTYPE;
  }
  Bullet.BoxShape.prototype.localGetSupportingVertex=function(vec,out) {
    var halfExtents = this.getHalfExtentsWithoutMargin(out);
    var margin = this.getMargin();
    halfExtents.x += margin;
    halfExtents.y += margin;
    halfExtents.z += margin;
        
    out.set3(
      Bullet.ScalarUtil.fsel(vec.x, halfExtents.x, -halfExtents.x),
      Bullet.ScalarUtil.fsel(vec.y, halfExtents.y, -halfExtents.y),
      Bullet.ScalarUtil.fsel(vec.z, halfExtents.z, -halfExtents.z));
    return out;
  }
  Bullet.BoxShape.prototype.localGetSupportingVertexWithoutMargin=function(vec,out) {
    var halfExtents = this.getHalfExtentsWithoutMargin(out);
    out.set3(
      Bullet.ScalarUtil.fsel(vec.x,halfExtents.x,-halfExtents.x),
      Bullet.ScalarUtil.fsel(vec.y,halfExtents.y,-halfExtents.y),
      Bullet.ScalarUtil.fsel(vec.z,halfExtents.z,-halfExtents.z));
    return out;
  }
  Bullet.BoxShape.prototype.getAabb=function(t,aabbMin,aabbMax) {
    this.halfExtents.set3(0,0,0);
    this.halfExtents = this.getHalfExtentsWithoutMargin(this.halfExtents);//Stack._alloc(Vector3f.class));
    this.abs_b.set1(t.basis);//Matrix3f abs_b = Stack._alloc(t.basis);
    Bullet.MatrixUtil.absolute(this.abs_b);
     
    this.tmp.set3(0,0,0);//Vector3f tmp = Stack_.alloc(Vector3f.class);
        
    this.center.set1(t.origin);//Vector3f center = Stack._alloc(t.origin);
    this.extent.set3(0,0,0);//Vector3f extent = Stack._alloc(Vector3f.class);
    this.abs_b.getRow(0, this.tmp);
    this.extent.x = this.tmp.dot(this.halfExtents);
    this.abs_b.getRow(1, this.tmp);
    this.extent.y = this.tmp.dot(this.halfExtents);
    this.abs_b.getRow(2, this.tmp);
    this.extent.z = this.tmp.dot(this.halfExtents);
        
    this.margin.set3(0,0,0);//Vector3f margin = Stack._alloc(Vector3f.class);
    this.margin.set3(this.getMargin(),this.getMargin(),this.getMargin());
    this.extent.add1(this.margin);
        
    aabbMin.sub2(this.center, this.extent);
    aabbMax.add2(this.center, this.extent);
  }
  Bullet.BoxShape.prototype.calculateLocalInertia=function(mass,inertia) {
    this.halfExtents.set3(0,0,0);this.halfExtents = this.getHalfExtentsWithMargin(this.halfExtents);//Stack._alloc(Vector3f.class));
        
    var lx = 2 * this.halfExtents.x;
    var ly = 2 * this.halfExtents.y;
    var lz = 2 * this.halfExtents.z;
        
    inertia.set3(mass / 12 * (ly * ly + lz * lz),
      mass / 12 * (lx * lx + lz * lz),
      mass / 12 * (lx * lx + ly * ly));
  }
  Bullet.BoxShape.prototype.toString=function() {
    return "BoxShape";
  }
  Bullet.DispatchFunc=function() {}
  Bullet.DispatchFunc.DISPATCH_DISCRETE=1;
  Bullet.DispatchFunc.DISPATCH_CONTINUOUS=2;
  Bullet.DispatcherInfo=function() {
    this.dispatchFunc = Bullet.DispatchFunc.DISPATCH_DISCRETE;
    this.timeOfImpact = 1;
  }
  Bullet.DispatcherInfo.prototype.timeStep=0;
  Bullet.DispatcherInfo.prototype.stepCount=0;
  Bullet.DispatcherInfo.prototype.dispatchFunc=0;
  Bullet.DispatcherInfo.prototype.timeOfImpact=0;
  Bullet.DispatcherInfo.prototype.useContinuous=false;
  Bullet.DispatcherInfo.prototype.enableSatConvex=false;
  Bullet.DispatcherInfo.prototype.enableSPU = true;
  Bullet.DispatcherInfo.prototype.useEpa = true;
  Bullet.DispatcherInfo.prototype.allowedCcdPenetration = 0.04;
  Bullet.CollisionFilterGroups={
    DEFAULT_FILTER   : 1,
    STATIC_FILTER    : 2,
    KINEMATIC_FILTER : 4,
    DEBRIS_FILTER    : 8,
    SENSOR_TRIGGER   : 16,
    ALL_FILTER       : -1 // all bits sets: DefaultFilter | StaticFilter | KinematicFilter | DebrisFilter | SensorTrigger
  }
  Bullet.Element=function() {}
  Bullet.Element.prototype.id=0;
  Bullet.Element.prototype.sz=0;
  Bullet.UnionFind=function() {
    this.elements=new Array();
  }
  Bullet.UnionFind.prototype.sortIslands=function() {
    // first store the original body index, and islandId
    var numElements = this.elements.length;
        
    for (var i = 0; i < numElements; i++) {
      this.elements[i].id = this.find(i);
      this.elements[i].sz = i;
    }
        
    Bullet.MiscUtil.quickSort(this.elements,Bullet.UnionFind.elementComparator);
  }
  Bullet.UnionFind.prototype.reset=function(N) {
    this.allocate(N);
        
    for (var i = 0; i < N; i++) {
      this.elements[i].id = i;
      this.elements[i].sz = 1;
    }
  }
  Bullet.UnionFind.prototype.getNumElements=function() {
    return this.elements.length;
  }
  Bullet.UnionFind.prototype.getElement=function(index) {
    return this.elements[index];
  }
  Bullet.UnionFind.prototype.allocate=function(N) {
    Bullet.MiscUtil.resizea(this.elements,N,function() {
      return new Bullet.Element();
    }
    );
  }
  Bullet.UnionFind.prototype.unite=function(p,q) {
    var i = this.find(p), j = this.find(q);
    if (i == j) {
      return;
    }
      
    this.elements[i].id = j;
    this.elements[j].sz += this.elements[i].sz;
  }
  Bullet.UnionFind.prototype.find=function(x) {
    while (x != this.elements[x].id) {
      this.elements[x].id = this.elements[this.elements[x].id].id;
      x = this.elements[x].id;
    }
    return x;
  }
  Bullet.UnionFind.elementComparator=function(o1,o2) {
    return o1.id < o2.id? -1 : +1;
  }
  Bullet.CollisionObjectType={
    COLLISION_OBJECT:1, 
    RIGID_BODY:2,
    SOFT_BODY:3}
  Bullet.CollisionFlags={
    STATIC_OBJECT            : 1,
    KINEMATIC_OBJECT         : 2,
    NO_CONTACT_RESPONSE      : 4,
    CUSTOM_MATERIAL_CALLBACK : 8}
  Bullet.poolManifoldPoint=new Bullet.ObjectPool(function() {
    return new Bullet.ManifoldPoint();
  }
  );
  Bullet.ManifoldResult=function() {
    this.rootTransA = new Bullet.Transform();
    this.rootTransB = new Bullet.Transform();
  }
  Bullet.ManifoldResult.prototype.pointsPool=Bullet.poolManifoldPoint;
  Bullet.ManifoldResult.prototype.partId0=0;
  Bullet.ManifoldResult.prototype.partId1=0;
  Bullet.ManifoldResult.prototype.index0=0;
  Bullet.ManifoldResult.prototype.index1=0;
  Bullet.ManifoldResult.prototype.init=function(body0,body1) {
    this.body0 = body0;
    this.body1 = body1;
    body0.getWorldTransform(this.rootTransA);
    body1.getWorldTransform(this.rootTransB);
  }
  Bullet.ManifoldResult.prototype.setPersistentManifold=function(manifoldPtr) {
    this.manifoldPtr = manifoldPtr;
  }
  Bullet.ManifoldResult.prototype.pointA=new Vecmath.Vec3();
  Bullet.ManifoldResult.prototype.localA=new Vecmath.Vec3();
  Bullet.ManifoldResult.prototype.localB=new Vecmath.Vec3();
  Bullet.ManifoldResult.prototype.addContactPoint=function(normalOnBInWorld,pointInWorld,depth) {
    //order in manifold needs to match
    if (depth > Bullet.BulletGlobals.contactBreakingThreshold) {
      return;
    }
    var isSwapped = this.manifoldPtr.body0 != this.body0;
        
    this.pointA.set3(0,0,0);//Vector3f pointA = Stack._alloc(Vector3f.class);
    this.pointA.scaleAdd(depth, normalOnBInWorld, pointInWorld);
        
    this.localA.set3(0,0,0);//Vector3f localA = Stack._alloc(Vector3f.class);
    this.localB.set3(0,0,0);//Vector3f localB = Stack._alloc(Vector3f.class);
    
    if (isSwapped) {
      this.rootTransB.invXform(this.pointA,this.localA);
      this.rootTransA.invXform(this.pointInWorld,this.localB);
    } else {
      this.rootTransA.invXform(this.pointA,this.localA);
      this.rootTransB.invXform(pointInWorld,this.localB);
    }
        
    var newPt = this.pointsPool.get();//new ManifoldPoint();//pointsPool.get();
    newPt.init(this.localA,this.localB,normalOnBInWorld,depth);
        
    newPt.positionWorldOnA.set1(this.pointA);
    newPt.positionWorldOnB.set1(pointInWorld);
        
    var insertIndex = this.manifoldPtr.getCacheEntry(newPt);
        
    newPt.combinedFriction = Bullet.ManifoldResult.calculateCombinedFriction(this.body0,this.body1);
    newPt.combinedRestitution = Bullet.ManifoldResult.calculateCombinedRestitution(this.body0,this.body1);
        
    // BP mod, store contact triangles.
    newPt.partId0 = this.partId0;
    newPt.partId1 = this.partId1;
    newPt.index0 = this.index0;
    newPt.index1 = this.index1;
        
    /// todo, check this for any side effects
    if (insertIndex >= 0) {
      //const btManifoldPoint& oldPoint = m_manifoldPtr->getContactPoint(insertIndex);
      this.manifoldPtr.replaceContactPoint(newPt, insertIndex);
    } else {
      insertIndex = this.manifoldPtr.addManifoldPoint(newPt);
    }
        
    this.pointsPool.release(newPt);
  }
  Bullet.ManifoldResult.calculateCombinedFriction=function(body0,body1) {
    var friction = body0.friction * body1.friction;
    var MAX_FRICTION = 10;
    if (friction < -MAX_FRICTION) {
      friction = -MAX_FRICTION;
    }
    if (friction > MAX_FRICTION) {
      friction = MAX_FRICTION;
    }
    return friction;
  }
  Bullet.ManifoldResult.calculateCombinedRestitution=function(body0,body1) {
    return body0.restitution * body1.restitution;
  }
  Bullet.ManifoldResult.prototype.refreshContactPoints=function() {
    if (this.manifoldPtr.cachedPoints == 0) {
      return;
    }
    var isSwapped = this.manifoldPtr.body0 != this.body0;
        
    if (isSwapped) {
      this.manifoldPtr.refreshContactPoints(this.rootTransB, this.rootTransA);
    } else {
      this.manifoldPtr.refreshContactPoints(this.rootTransA, this.rootTransB);
    }
  }
  Bullet.ManifoldResult.prototype.toString=function() {
    return "ManifoldResult("+this.manifoldPtr+")";
  }
  Bullet.CollisionObject=function() {
    this.worldTransform = new Bullet.Transform();
    this.interpolationWorldTransform = new Bullet.Transform();
    this.interpolationLinearVelocity = new Vecmath.Vec3();
    this.interpolationAngularVelocity = new Vecmath.Vec3();
    this.collisionFlags = Bullet.CollisionFlags.STATIC_OBJECT;
    this.islandTag1 = -1;
    this.companionId = -1;
    this.activationState1 = 1;
    this.friction = 0.5;
    this.hitFraction = 1;
  }
  Bullet.CollisionObject.ACTIVE_TAG = 1;
  Bullet.CollisionObject.ISLAND_SLEEPING = 2;
  Bullet.CollisionObject.WANTS_DEACTIVATION = 3;
  Bullet.CollisionObject.DISABLE_DEACTIVATION = 4;
  Bullet.CollisionObject.DISABLE_SIMULATION = 5;
  Bullet.CollisionObject.prototype.collisionFlags=0;
  Bullet.CollisionObject.prototype.islandTag1=0;
  Bullet.CollisionObject.prototype.companionId=0;
  Bullet.CollisionObject.prototype.activationState1=0;
  Bullet.CollisionObject.prototype.deactivationTime=0;
  Bullet.CollisionObject.prototype.friction=0;
  Bullet.CollisionObject.prototype.restitution=0;
  Bullet.CollisionObject.prototype.internalType = Bullet.CollisionObjectType.COLLISION_OBJECT;
  Bullet.CollisionObject.prototype.hitFraction=0;
  Bullet.CollisionObject.prototype.ccdSquareMotionThreshold=0;
  Bullet.CollisionObject.prototype.checkCollideWith=false;
  Bullet.CollisionObject.prototype.mergesSimulationIslands=function() {
    return ((this.collisionFlags & (Bullet.CollisionFlags.STATIC_OBJECT | Bullet.CollisionFlags.KINEMATIC_OBJECT | Bullet.CollisionFlags.NO_CONTACT_RESPONSE)) == 0);
  }
  Bullet.CollisionObject.prototype.isStaticObject=function() {
    return (this.collisionFlags & Bullet.CollisionFlags.STATIC_OBJECT) != 0;
  }
  Bullet.CollisionObject.prototype.isKinematicObject=function() {
    return (this.collisionFlags & Bullet.CollisionFlags.KINEMATIC_OBJECT) != 0;
  }
  Bullet.CollisionObject.prototype.isStaticOrKinematicObject=function() {
    return (this.collisionFlags & (Bullet.CollisionFlags.KINEMATIC_OBJECT | Bullet.CollisionFlags.STATIC_OBJECT)) != 0;
  }
  Bullet.CollisionObject.prototype.hasContactResponse=function() {
    return (this.collisionFlags & Bullet.CollisionFlags.NO_CONTACT_RESPONSE) == 0;
  }
  Bullet.CollisionObject.prototype.setCollisionShape=function(collisionShape) {
    this.collisionShape = collisionShape;
    this.rootCollisionShape = collisionShape;
  }
  Bullet.CollisionObject.prototype.setActivationState=function(newState) {
    if ((this.activationState1 != Bullet.CollisionObject.DISABLE_DEACTIVATION) && (this.activationState1 != Bullet.CollisionObject.DISABLE_SIMULATION)) {
      this.activationState1 = newState;
    }
  }
  Bullet.CollisionObject.prototype.activate=function() {
    this.activate1(false);
  }
  Bullet.CollisionObject.prototype.activate1=function(forceActivation) {
    if (forceActivation || (this.collisionFlags & (Bullet.CollisionFlags.STATIC_OBJECT | Bullet.CollisionFlags.KINEMATIC_OBJECT)) == 0) {
      this.setActivationState(Bullet.CollisionObject.ACTIVE_TAG);
      this.deactivationTime = 0;
    }
  }
  Bullet.CollisionObject.prototype.isActive=function() {
    return ((this.activationState1 != Bullet.CollisionObject.ISLAND_SLEEPING) && (this.activationState1 != Bullet.CollisionObject.DISABLE_SIMULATION));
  }
  Bullet.CollisionObject.prototype.getWorldTransform=function(out) {
    out.setT(this.worldTransform);
    return out;
  }
  Bullet.CollisionObject.prototype.setWorldTransform=function(worldTransform) {
    this.worldTransform.setT(worldTransform);
  }
  Bullet.CollisionObject.prototype.getInterpolationWorldTransform=function(out) {
    out.setT(this.interpolationWorldTransform);
    return out;
  }
  Bullet.CollisionObject.prototype.getInterpolationLinearVelocity=function(out) {
    out.set1(this.interpolationLinearVelocity);
    return out;
  }
  Bullet.CollisionObject.prototype.getInterpolationAngularVelocity=function(out) {
    out.set1(this.interpolationAngularVelocity);
    return out;
  }
  Bullet.poolBroadphasePair=new Bullet.ObjectPool(function() {
    return new Bullet.BroadphasePair(null,null);
  }
  );
  Bullet.OverlappingPairCache=function() {
    this.overlappingPairArray = new Bullet.ObjectArrayList();
    this.hashTable = new Bullet.ObjectArrayList();
    this.next = new Bullet.ObjectArrayList();
    //var initialAllocatedSize = 2;
    // JAVA TODO: overlappingPairArray.ensureCapacity(initialAllocatedSize);
    this.hashTable.array=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    //ullet.out("OverlappingPairCache 0 "+this.hashTable);        
    this.growTables();
    //ullet.out("OverlappingPairCache 1 "+this.hashTable);        
    
  }
  Bullet.OverlappingPairCache.prototype.pairsPool=Bullet.poolBroadphasePair;
  Bullet.OverlappingPairCache.NULL_PAIR = -1;//0xffffffff;
  Bullet.OverlappingPairCache.prototype.blockedForChanges = false;
  Bullet.OverlappingPairCache.prototype.addOverlappingPair=function(proxy0,proxy1) {
    //BulletStats.gAddedPairs++;
    if (!this.needsBroadphaseCollision(proxy0, proxy1)) {
      return null;
    }
    return this.internalAddPair(proxy0,proxy1);
  }
  Bullet.OverlappingPairCache.prototype.removeOverlappingPair=function(proxy0,proxy1,dispatcher) {
    //BulletStats.gRemovePairs++;
    if (proxy0.uniqueId > proxy1.uniqueId) {
      var tmp = proxy0;
      proxy0 = proxy1;
      proxy1 = tmp;
    }
    var proxyId1 = proxy0.uniqueId;
    var proxyId2 = proxy1.uniqueId;
        
    var hash = this.getHash(proxyId1, proxyId2) & (this.overlappingPairArray.capacity() - 1);
    var pair = this.internalFindPair(proxy0, proxy1, hash);
    if (pair == null) {
      return null;
    }
       
    this.cleanOverlappingPair(pair, dispatcher);
    var userData = pair.userInfo;
    
    var pairIndex = this.overlappingPairArray.indexOf(pair);
    var index = this.hashTable.get(hash);
    
    var previous = Bullet.OverlappingPairCache.NULL_PAIR;
    while (index != pairIndex) {
      previous = index;
      index = this.next.get(index);
    }
       
    if (previous != NULL_PAIR) {
      this.next.set(previous, this.next.get(pairIndex));
    } else {
      this.hashTable.set(hash,this.next.get(pairIndex));
    }
        
    var lastPairIndex = this.overlappingPairArray.size() - 1;
       
    if (lastPairIndex == pairIndex) {
      this.overlappingPairArray.remove(this.overlappingPairArray.size() - 1);
      return userData;
    }
        
    // Remove the last pair from the hash table.
    var last = this.overlappingPairArray.get(lastPairIndex);
    var lastHash = this.getHash(last.pProxy0.uniqueId, last.pProxy1.uniqueId) & (this.overlappingPairArray.capacity() - 1);
        
    index = this.hashTable.get(lastHash);
    
    previous = Bullet.OverlappingPairCache.NULL_PAIR;
    while (index != lastPairIndex) {
      previous = index;
      index = next.get(index);
    }
        
    if (previous != Bullet.OverlappingPairCache.NULL_PAIR) {
      this.next.set(previous,this.next.get(lastPairIndex));
    } else {
      this.hashTable.set(lastHash, next.get(lastPairIndex));
    }
    
    // Copy the last pair into the remove pair's spot.
    this.overlappingPairArray.get(pairIndex).set(this.overlappingPairArray.get(lastPairIndex));
    // Insert the last pair into the hash table
    this.next.set(pairIndex,this.hashTable.get(lastHash));
    this.hashTable.set(lastHash, pairIndex);
        
    this.overlappingPairArray.remove(this.overlappingPairArray.size() - 1);
    return userData;
  }
  Bullet.OverlappingPairCache.prototype.needsBroadphaseCollision=function(proxy0,proxy1) {
    var collides = (proxy0.collisionFilterGroup & proxy1.collisionFilterMask) != 0;
    collides = collides && (proxy1.collisionFilterGroup & proxy0.collisionFilterMask) != 0;
        
    return collides;
  }
  Bullet.OverlappingPairCache.prototype.processAllOverlappingPairs=function(callback,dispatcher) {
    for (var i=0; i<this.overlappingPairArray.sizef(); ) {
      var pair = this.overlappingPairArray.get(i);
      if (callback.processOverlap(pair)) {
        this.removeOverlappingPair(pair.pProxy0, pair.pProxy1, dispatcher);
      } else {
        i++;
      }
    }
  }
  Bullet.OverlappingPairCache.prototype.cleanOverlappingPair=function(pair,dispatcher) {
    if (pair.algorithm != null) {
      //pair.algorithm.destroy();
      //dispatcher.freeCollisionAlgorithm(pair.algorithm);
      pair.algorithm = null;
    }
  }
  Bullet.OverlappingPairCache.prototype.findPair=function(proxy0,proxy1) {
    if (proxy0.uniqueId > proxy1.uniqueId) {
      var tmp = proxy0;
      proxy0 = proxy1;
      proxy1 = proxy0;
    }
    var proxyId1 = proxy0.uniqueId;
    var proxyId2 = proxy1.uniqueId;
    var hash = this.getHash(proxyId1, proxyId2) & (this.overlappingPairArray.capacity()-1);
    if (hash >= this.hashTable.size()) {
      return null;
    }
    var index = this.hashTable.get(hash);
    while (index != Bullet.OverlappingPairCache.NULL_PAIR && equalsPair(this.overlappingPairArray.get(index), proxyId1, proxyId2) == false) {
      index = this.next.get(index);
    }
    if (index == Bullet.OverlappingPairCache.NULL_PAIR) {
      return null;
    }
     
    return this.overlappingPairArray.get(index);
  }
  Bullet.OverlappingPairCache.prototype.getCount=function() {
    return this.overlappingPairArray.size();
  }
  Bullet.OverlappingPairCache.prototype.getNumOverlappingPairs=function() {
    return this.overlappingPairArray.size();
  }
  Bullet.OverlappingPairCache.prototype.hasDeferredRemoval=function() {
    return false;
  }
  Bullet.OverlappingPairCache.prototype.internalAddPair=function(proxy0,proxy1) {
    if (proxy0.uniqueId > proxy1.uniqueId) {
      var tmp = proxy0;
      proxy0 = proxy1;
      proxy1 = tmp;
    }
    var proxyId1 = proxy0.uniqueId;
    var proxyId2 = proxy1.uniqueId;
    
    var hash = this.getHash(proxyId1, proxyId2) & (this.overlappingPairArray.capacity() - 1); // New hash value with new mask
    //ullet.out("OverlappingPairCache.internalAddPair "+proxyId1+" "+proxyId2+" "+this.overlappingPairArray.capacity()+" "+hash);if (1==1) throw new Error("€");
        
    var pair = this.internalFindPair(proxy0, proxy1, hash);
    if (pair != null) {
      return pair;
    }
    var count = this.overlappingPairArray.sizef();
    var oldCapacity = this.overlappingPairArray.capacity();
    this.overlappingPairArray.add(null);
    var newCapacity = this.overlappingPairArray.capacity();
        
    if (oldCapacity < newCapacity) {
      this.growTables();
      // hash with new capacity
      hash = this.getHash(proxyId1, proxyId2) & (this.overlappingPairArray.capacity() - 1);
    }
    
    pair = new Bullet.BroadphasePair(proxy0, proxy1);
    pair.algorithm = null;
    pair.userInfo = null;
        
    this.overlappingPairArray.set(this.overlappingPairArray.sizef() - 1, pair);
        
    this.next.set(count, this.hashTable.get(hash));
    this.hashTable.set(hash, count);
        
    return pair;
  }
  Bullet.OverlappingPairCache.prototype.growTables=function() {
    var newCapacity = this.overlappingPairArray.capacity();
    
    //ullet.out("OverlappingPairCache.growTables "+(this.hashTable.sizef())+" "+newCapacity);    
    
    if (this.hashTable.sizef() < newCapacity) {
      // grow hashtable and next table
      var curHashtableSize = this.hashTable.sizef();
      Bullet.MiscUtil.resizec(this.hashTable, newCapacity, 0);
      Bullet.MiscUtil.resizec(this.next, newCapacity, 0);
      for (var i=0; i<newCapacity; ++i) {
        this.hashTable.set(i,Bullet.OverlappingPairCache.NULL_PAIR);
      }
      for (var i=0; i<newCapacity; ++i) {
        this.next.set(i,Bullet.OverlappingPairCache.NULL_PAIR);
      }
        
      for (var i=0; i<curHashtableSize; i++) {
        var pair = this.overlappingPairArray.get(i);
        var proxyId1 = pair.pProxy0.uniqueId;
        var proxyId2 = pair.pProxy1.uniqueId;
        var hashValue = this.getHash(proxyId1, proxyId2) & (this.overlappingPairArray.capacity() - 1); // New hash value with new mask
        this.next.set(i,this.hashTable.get(hashValue));
        this.hashTable.set(hashValue, i);
      }
    }
  }
  Bullet.OverlappingPairCache.prototype.equalsPair=function(pair,proxyId1,proxyId2) {
    //if (pair==null) throw this.overlappingPairArray;//arguments.callee.caller;
    if (pair==null) throw arguments.callee.caller;
    return pair.pProxy0.uniqueId == proxyId1 && pair.pProxy1.uniqueId == proxyId2;
  }
  Bullet.OverlappingPairCache.prototype.getHash=function(proxyId1,proxyId2) {
    var key = (proxyId1) | (proxyId2 << 16);
      // Thomas Wang's hash
      key += ~(key << 15);
      key ^= (key >>> 10);
      key += (key << 3);
      key ^= (key >>> 6);
      key += ~(key << 11);
      key ^= (key >>> 16);
    return key;
  }
  Bullet.OverlappingPairCache.prototype.internalFindPair=function(proxy0,proxy1,hash) {
    var proxyId1 = proxy0.uniqueId;
    var proxyId2 = proxy1.uniqueId;
    var index = this.hashTable.get(hash);
    
    //ullet.out("OverlappingPairCache.internalFindPair "+this.hashTable);        
    //ullet.out("OverlappingPairCache.internalFindPair "+this.overlappingPairArray+" "+index+" "+(index != Bullet.OverlappingPairCache.NULL_PAIR)+" "+hash);
    while (index != Bullet.OverlappingPairCache.NULL_PAIR && this.equalsPair(this.overlappingPairArray.get(index), proxyId1, proxyId2) == false) {
      index = this.next.get(index);
    }
    
    if (index == Bullet.OverlappingPairCache.NULL_PAIR) {
      return null;
    }
    
    return this.overlappingPairArray.get(index);
  }
  Bullet.OverlappingPairCache.prototype.toString=function() {
    return "OverlappingPairCache";
  }
  Bullet.EdgeArray=function(size) {
    this.pos = new Array(size);
    this.handle = new Array(size);
  }
  Bullet.EdgeArray.prototype.swap=function(idx1,idx2) {
    var tmpPos = this.pos[idx1];
    var tmpHandle = this.handle[idx1];
        
    this.pos[idx1] = this.pos[idx2];
    this.handle[idx1] = this.handle[idx2];
        
    this.pos[idx2] = tmpPos;
    this.handle[idx2] = tmpHandle;
  }
  Bullet.EdgeArray.prototype.set=function(dest,src) {
    this.pos[dest] = this.pos[src];
    this.handle[dest] = this.handle[src];
  }
  Bullet.EdgeArray.prototype.getPos=function(index) {
    return this.pos[index] & 0xFFFF;
  }
  Bullet.EdgeArray.prototype.setPos=function(index,value) {
    this.pos[index] = value;
  }
  Bullet.EdgeArray.prototype.getHandle=function(index) {
    var s="";
    for (var h=0;h<10;h++) s+=this.handle[h]+",";
    
    //ullet.out("EdgeArray.getHandle "+index+" "+this.handle[index]+" --- "+s);
    return this.handle[index] & 0xFFFF;
  }
  Bullet.EdgeArray.prototype.setHandle=function(index,value) {
    //ullet.out("EdgeArray.setHandle "+index+" "+value);
    //if (index==3) throw arguments.callee.caller;
    this.handle[index] = value;
  }
  Bullet.EdgeArray.prototype.isMax=function(offset) {
    return (this.getPos(offset) & 1);
  }
  Bullet.EdgeArray.prototype.toString=function() {
    return "EdgeArray["+this.pos.length+"/"+this.handle.length+"]";
  }
  Bullet.BroadphaseInterface=function(worldAabbMin,worldAabbMax,handleMask,handleSentinel,userMaxHandles,pairCache) {
    this.worldAabbMin = new Vecmath.Vec3(); // overall system bounds
    this.worldAabbMax = new Vecmath.Vec3(); // overall system bounds
    this.quantize = new Vecmath.Vec3();     // scaling factor for quantization
    this.pEdges = new Array(3);      // edge arrays for the 3 axes (each array has m_maxHandles * 2 + 2 sentinel entries)
    this.aabbSize=new Vecmath.Vec3(),
    this.clampedPoint=new Vecmath.Vec3(),
    this.v=new Vecmath.Vec3();
    //was AxisSweep3
    this.bpHandleMask = handleMask;
    this.handleSentinel = handleSentinel;
    this.pairCache = pairCache;
    var maxHandles = userMaxHandles + 1; // need to add one sentinel handle
        
    if (this.pairCache == null) {
      this.pairCache = new Bullet.OverlappingPairCache();
      this.ownsPairCache = true;
    }
        
    // init bounds
    this.worldAabbMin.set1(worldAabbMin);
    this.worldAabbMax.set1(worldAabbMax);
        
    this.aabbSize.set3(0,0,0);//Vector3f aabbSize = Stack._alloc(Vector3f.class);
    this.aabbSize.sub2(this.worldAabbMax, this.worldAabbMin);
        
    var maxInt = this.handleSentinel;
        
    this.quantize.set3(maxInt / this.aabbSize.x, maxInt / this.aabbSize.y, maxInt / this.aabbSize.z);
        
    // allocate handles buffer and put all handles on free list
    this.pHandles = new Array(maxHandles);
    for (var i=0; i<maxHandles; i++) {
      this.pHandles[i] = this.createHandle();
    }
    this.maxHandles = maxHandles;
    this.numHandles = 0;
    //ullet.out("BroadphaseInterface "+Bullet.a2s(this.pHandles,5));
            
    // handle 0 is reserved as the null index, and is also used as the sentinel
    this.firstFreeHandle = 1;
    {
      for (var i=this.firstFreeHandle; i<maxHandles; i++) {
        this.pHandles[i].setNextFree(i+1);
      }
      this.pHandles[maxHandles - 1].setNextFree(0);
    }
        
    //ullet.out("BroadphaseInterface "+Bullet.a2s(this.pHandles,5));
    //if (1==1) throw new Error("€");
    
    {
      // allocate edge buffers
      for (var i=0; i<3; i++) {
        this.pEdges[i] = this.createEdgeArray(maxHandles*2);
      }
    }
    //removed overlap management
    // make boundary sentinels
    this.pHandles[0].clientObject = null;
        
    for (var axis = 0; axis < 3; axis++) {
      this.pHandles[0].setMinEdges(axis, 0);
      this.pHandles[0].setMaxEdges(axis, 1);
        
      this.pEdges[axis].setPos(0, 0);
      this.pEdges[axis].setHandle(0, 0);
      this.pEdges[axis].setPos(1, handleSentinel);
      this.pEdges[axis].setHandle(1, 0);
    }
    
    
    
    // JAVA NOTE: added
    this.mask = 0xFFFF;//getMask();
  }
  Bullet.BroadphaseInterface.prototype.bpHandleMask=0;
  Bullet.BroadphaseInterface.prototype.handleSentinel=0;
  Bullet.BroadphaseInterface.prototype.numHandles=0;                               // number of active handles
  Bullet.BroadphaseInterface.prototype.maxHandles=0;                               // max number of handles
  Bullet.BroadphaseInterface.prototype.firstFreeHandle=0;                    // free handles list
  // OverlappingPairCallback is an additional optional user callback for adding/removing overlapping pairs, similar interface to OverlappingPairCache.
  Bullet.BroadphaseInterface.prototype.ownsPairCache = false;
  Bullet.BroadphaseInterface.prototype.invalidPair = 0;
  // JAVA NOTE: added
  Bullet.BroadphaseInterface.prototype.mask=0;
  // allocation/deallocation
  Bullet.BroadphaseInterface.prototype.allocHandle=function() {
    var handle = this.firstFreeHandle;
    this.firstFreeHandle = this.getHandle(handle).getNextFree();
    this.numHandles++;
    //ullet.out("BroadphaseInterface.allocHandle "+handle+" "+Bullet.a2s(this.pHandles,5));
    return handle;
  }
  Bullet.BroadphaseInterface.prototype.testOverlap=function(ignoreAxis,pHandleA,pHandleB) {
    // optimization 1: check the array index (memory address), instead of the m_pos
    for (var axis=0; axis<3; axis++) {
      if (axis != ignoreAxis) {
        if (pHandleA.getMaxEdges(axis) < pHandleB.getMinEdges(axis) ||
    pHandleB.getMaxEdges(axis) < pHandleA.getMinEdges(axis)) {
      return false;
    }
      }
    }
    return true;
  }
  Bullet.BroadphaseInterface.prototype.quantize3=function(out,point,isMax) {
    this.clampedPoint.set3(0,0,0);//Vector3f clampedPoint = Stack._alloc(point);
        
    Bullet.VectorUtil.setMax(this.clampedPoint, this.worldAabbMin);
    Bullet.VectorUtil.setMin(this.clampedPoint, this.worldAabbMax);
        
    this.v.set3(0,0,0);//Vector3f v = Stack._alloc(Vector3f.class);
    this.v.sub2(this.clampedPoint, this.worldAabbMin);
    Bullet.VectorUtil.mul(this.v, this.v, this.quantize);
        
    out[0] = ((Math.floor(this.v.x) & this.bpHandleMask) | isMax) & this.mask;//(int)
    out[1] = ((Math.floor(this.v.y) & this.bpHandleMask) | isMax) & this.mask;
    out[2] = ((Math.floor(this.v.z) & this.bpHandleMask) | isMax) & this.mask;
  }
  // sorting a min edge downwards can only ever *add* overlaps
  Bullet.BroadphaseInterface.prototype.sortMinDown=function(axis,edge,dispatcher,updateOverlaps) {
    var edgeArray = this.pEdges[axis];
    var pEdge_idx = edge;
    var pPrev_idx = pEdge_idx - 1;
        
    var pHandleEdge = this.getHandle(edgeArray.getHandle(pEdge_idx));
    //ullet.out("sortMinDown "+pHandleEdge.uniqueId+" "+pEdge_idx+" "+axis+" "+edgeArray.getHandle(pEdge_idx)+" "+edgeArray);
        
    while (edgeArray.getPos(pEdge_idx) < edgeArray.getPos(pPrev_idx)) {
      var pHandlePrev = this.getHandle(edgeArray.getHandle(pPrev_idx));
        
      if (edgeArray.isMax(pPrev_idx) != 0) {
        // if previous edge is a maximum check the bounds and add an overlap if necessary
        if (updateOverlaps && this.testOverlap(axis, pHandleEdge, pHandlePrev)) {
          this.pairCache.addOverlappingPair(pHandleEdge, pHandlePrev);
          if (this.userPairCallback != null) {
            this.userPairCallback.addOverlappingPair(pHandleEdge, pHandlePrev);
            //AddOverlap(pEdge->m_handle, pPrev->m_handle);
          }
        }
        
        // update edge reference in other handle
        pHandlePrev.incMaxEdges(axis);
      } else {
        pHandlePrev.incMinEdges(axis);
      }
      pHandleEdge.decMinEdges(axis);
        
      // swap the edges
      edgeArray.swap(pEdge_idx, pPrev_idx);
      // decrement
      pEdge_idx--;
      pPrev_idx--;
    }
  }
  //  // sorting a max edge downwards can only ever *remove* overlaps
  Bullet.BroadphaseInterface.prototype.sortMaxDown=function(axis,edge,dispatcher,updateOverlaps) {
    var edgeArray = this.pEdges[axis];
    var pEdge_idx = edge;
    var pPrev_idx = pEdge_idx - 1;
    var pHandleEdge = this.getHandle(edgeArray.getHandle(pEdge_idx));
        
    while (edgeArray.getPos(pEdge_idx) < edgeArray.getPos(pPrev_idx)) {
      var pHandlePrev = this.getHandle(edgeArray.getHandle(pPrev_idx));
        
      if (edgeArray.isMax(pPrev_idx) == 0) {
        // if previous edge was a minimum remove any overlap between the two handles
        if (updateOverlaps) {
          // this is done during the overlappingpairarray iteration/narrowphase collision
          var handle0 = this.getHandle(edgeArray.getHandle(pEdge_idx));
          var handle1 = this.getHandle(edgeArray.getHandle(pPrev_idx));
          this.pairCache.removeOverlappingPair(handle0, handle1, dispatcher);
          if (this.userPairCallback != null) {
            this.userPairCallback.removeOverlappingPair(handle0, handle1, dispatcher);
          }
        }
        
        // update edge reference in other handle
        pHandlePrev.incMinEdges(axis);
      } else {
        pHandlePrev.incMaxEdges(axis);
      }
      pHandleEdge.decMaxEdges(axis);
        
      // swap the edges
      edgeArray.swap(pEdge_idx, pPrev_idx);
       
      // decrement
      pEdge_idx--;
      pPrev_idx--;
    }
  }
  Bullet.BroadphaseInterface.prototype.calculateOverlappingPairs=function(dispatcher) {
    if (this.pairCache.hasDeferredRemoval()) {
      var overlappingPairArray = this.pairCache.overlappingPairArray;
        
      // perform a sort, to find duplicates and to sort 'invalid' pairs to the end
      Bullet.MiscUtil.quickSort(overlappingPairArray, Bullet.BroadphasePair.broadphasePairSortPredicate);
       
      Bullet.MiscUtil.resizea(overlappingPairArray, overlappingPairArray.size() - this.invalidPair,Bullet.BroadphasePair.createF);//BroadphasePair.class);
      this.invalidPair = 0;
        
      var i=0;
      var previousPair = new Bullet.BroadphasePair(null,null);
      previousPair.pProxy0 = null;
      previousPair.pProxy1 = null;
      previousPair.algorithm = null;
        
      for (i=0; i<overlappingPairArray.size(); i++) {
        var pair = overlappingPairArray.get(i);
        
        var isDuplicate = (pair.equals(previousPair));
        previousPair.set(pair);
        var needsRemoval = false;
        
        if (!isDuplicate) {
        } else {
          // remove duplicate
          needsRemoval = true;
        }
        
        if (needsRemoval) {
          this.pairCache.cleanOverlappingPair(pair, dispatcher);
          pair.pProxy0 = null;
          pair.pProxy1 = null;
          this.invalidPair++;
        }
      }
      // perform a sort, to sort 'invalid' pairs to the end
      Bullet.MiscUtil.quickSort(overlappingPairArray, Bullet.BroadphasePair.broadphasePairSortPredicate);
        
      Bullet.MiscUtil.resizea(overlappingPairArray, overlappingPairArray.size() - this.invalidPair, Bullet.BroadphasePair.createF);
      this.invalidPair = 0;
    }
  }
  Bullet.BroadphaseInterface.prototype.addHandle=function(aabbMin,aabbMax,pOwner,collisionFilterGroup,collisionFilterMask,dispatcher,multiSapProxy) {
    // quantize the bounds
    var min = new Array(3), max = new Array(3);
    this.quantize3(min, aabbMin, 0);
    this.quantize3(max, aabbMax, 1);
        
    // allocate a handle
    var handle = this.allocHandle(); 
    //ullet.out("BroadPhaseInterface.addHandle "+handle);
    var pHandle = this.getHandle(handle);
        
    pHandle.uniqueId = handle;
    pHandle.clientObject = pOwner;
    pHandle.collisionFilterGroup = collisionFilterGroup;
    pHandle.collisionFilterMask = collisionFilterMask;
    pHandle.multiSapParentProxy = multiSapProxy;
        
    // compute current limit of edge arrays
    var limit = this.numHandles * 2;
    // insert new edges just inside the max boundary edge
    for (var axis = 0; axis < 3; axis++) {
      this.pHandles[0].setMaxEdges(axis, this.pHandles[0].getMaxEdges(axis) + 2);
      this.pEdges[axis].set(limit + 1, limit - 1);
      this.pEdges[axis].setPos(limit - 1, min[axis]);
      this.pEdges[axis].setHandle(limit - 1, handle);
        
      this.pEdges[axis].setPos(limit, max[axis]);
      this.pEdges[axis].setHandle(limit, handle);
        
      pHandle.setMinEdges(axis, limit - 1);
      pHandle.setMaxEdges(axis, limit);
    }
    // now sort the new edges to their correct position
    this.sortMinDown(0, pHandle.getMinEdges(0), dispatcher, false);
    this.sortMaxDown(0, pHandle.getMaxEdges(0), dispatcher, false);
    this.sortMinDown(1, pHandle.getMinEdges(1), dispatcher, false);
    this.sortMaxDown(1, pHandle.getMaxEdges(1), dispatcher, false);
    this.sortMinDown(2, pHandle.getMinEdges(2), dispatcher, true);
    this.sortMaxDown(2, pHandle.getMaxEdges(2), dispatcher, true);
    return handle;
  }
  Bullet.BroadphaseInterface.prototype.updateHandle=function(handle,aabbMin,aabbMax,dispatcher) {
    var pHandle=this.getHandle(handle);
    // quantize the new bounds
    var min = new Array(3), max = new Array(3);
    this.quantize3(min, aabbMin, 0);
    this.quantize3(max, aabbMax, 1);
        
    // update changed edges
    for (var axis = 0; axis < 3; axis++) {
      var emin = pHandle.getMinEdges(axis);
      var emax = pHandle.getMaxEdges(axis);
      var dmin = Math.floor(min[axis]) - Math.floor(this.pEdges[axis].getPos(emin));
      var dmax = Math.floor(max[axis]) - Math.floor(this.pEdges[axis].getPos(emax));
      this.pEdges[axis].setPos(emin, min[axis]);
      this.pEdges[axis].setPos(emax, max[axis]);
    
      // expand (only adds overlaps)
      if (dmin < 0) {
        this.sortMinDown(axis, emin, dispatcher, true);
      }
      if (dmax > 0) {
        //sortMaxUp_(axis, emax, dispatcher, true); // shrink (only removes overlaps)
      }
      if (dmin > 0) {
        //sortMinUp_(axis, emin, dispatcher, true);
      }
      if (dmax < 0) {
        this.sortMaxDown(axis, emax, dispatcher, true);
      }
    }
  }
  Bullet.BroadphaseInterface.prototype.getHandle=function(index) {
    return this.pHandles[index];
  }
  Bullet.BroadphaseInterface.prototype.createProxy=function(aabbMin,aabbMax,shapeType,userPtr,collisionFilterGroup,collisionFilterMask,dispatcher,multiSapProxy) {
    var handleId = this.addHandle(aabbMin, aabbMax, userPtr, collisionFilterGroup, collisionFilterMask, dispatcher, multiSapProxy);
    var handle = this.getHandle(handleId);
    return handle;
  }
  Bullet.BroadphaseInterface.prototype.setAabb=function(proxy,aabbMin,aabbMax,dispatcher) {
    this.updateHandle(proxy.uniqueId,aabbMin,aabbMax,dispatcher);
  }
  Bullet.BroadphaseInterface.prototype.createEdgeArray=function(size) {
    return new Bullet.EdgeArray(size);
  }
  Bullet.BroadphaseInterface.prototype.createHandle=function() {
    return new Bullet.BroadphaseProxy();
  }
  Bullet.BroadphaseProxy=function() {}
  Bullet.BroadphaseProxy.prototype.collisionFilterGroup=0;
  Bullet.BroadphaseProxy.prototype.collisionFilterMask=0;
  Bullet.BroadphaseProxy.prototype.uniqueId=0; // uniqueId is introduced for paircache. could get rid of this, by calculating the address offset etc.
  //---from Handle
  Bullet.BroadphaseProxy.prototype.minEdges0=0;
  Bullet.BroadphaseProxy.prototype.minEdges1=0;
  Bullet.BroadphaseProxy.prototype.minEdges2=0;
  Bullet.BroadphaseProxy.prototype.maxEdges0=0;
  Bullet.BroadphaseProxy.prototype.maxEdges1=0;
  Bullet.BroadphaseProxy.prototype.maxEdges2=0;
  Bullet.BroadphaseProxy.prototype.getMinEdges=function(edgeIndex) {
    switch (edgeIndex) {
      default:
      case 0: return this.minEdges0 & 0xFFFF;
      case 1: return this.minEdges1 & 0xFFFF;
      case 2: return this.minEdges2 & 0xFFFF;
    }
  }
  Bullet.BroadphaseProxy.prototype.setMinEdges=function(edgeIndex,value) {
    switch (edgeIndex) {
      case 0: this.minEdges0 = value; break;
      case 1: this.minEdges1 = value; break;
      case 2: this.minEdges2 = value; break;
    }
  }
  Bullet.BroadphaseProxy.prototype.getMaxEdges=function(edgeIndex) {
    switch (edgeIndex) {
      default:
      case 0: return this.maxEdges0 & 0xFFFF;
      case 1: return this.maxEdges1 & 0xFFFF;
      case 2: return this.maxEdges2 & 0xFFFF;
    }
  }
  Bullet.BroadphaseProxy.prototype.setMaxEdges=function(edgeIndex,value) {
    switch (edgeIndex) {
      case 0: this.maxEdges0 = value; break;
      case 1: this.maxEdges1 = value; break;
      case 2: this.maxEdges2 = value; break;
    }
  }
  Bullet.BroadphaseProxy.prototype.incMinEdges=function(edgeIndex) {
    this.setMinEdges(edgeIndex, this.getMinEdges(edgeIndex)+1);
  }
  Bullet.BroadphaseProxy.prototype.incMaxEdges=function(edgeIndex) {
    this.setMaxEdges(edgeIndex, this.getMaxEdges(edgeIndex)+1);
  }
  Bullet.BroadphaseProxy.prototype.decMinEdges=function(edgeIndex) {
    this.setMinEdges(edgeIndex, this.getMinEdges(edgeIndex)-1);
  }
  Bullet.BroadphaseProxy.prototype.decMaxEdges=function(edgeIndex) {
    this.setMaxEdges(edgeIndex, this.getMaxEdges(edgeIndex)-1);
    
  }
  Bullet.BroadphaseProxy.prototype.setNextFree=function(next) {
    this.setMinEdges(0,next);
  }
  Bullet.BroadphaseProxy.prototype.getNextFree=function() {
    return this.getMinEdges(0);
  }
  Bullet.BroadphaseProxy.prototype.toString=function() {
    return "BroadPhaseProxy["+this.uniqueId+";minEdges:"+this.minEdges0+","+this.minEdges1+","+this.minEdges2+"]";
  }
  Bullet.CollisionAlgorithmConstructionInfo=function() {}
  Bullet.BroadphasePair=function(pProxy0,pProxy1) {
    this.pProxy0 = pProxy0;
    this.pProxy1 = pProxy1;
    this.algorithm = null;
    this.userInfo = null;
  }
  Bullet.BroadphasePair.prototype.set=function(p) {
    this.pProxy0 = p.pProxy0;
    this.pProxy1 = p.pProxy1;
    this.algorithm = p.algorithm;
    this.userInfo = p.userInfo;
  }
  Bullet.BroadphasePair.broadphasePairSortPredicate=function(a,b) {
    var result = a.pProxy0.uniqueId > b.pProxy0.uniqueId ||
      (a.pProxy0.uniqueId == b.pProxy0.uniqueId && a.pProxy1.uniqueId > b.pProxy1.uniqueId) ||
      (a.pProxy0.uniqueId == b.pProxy0.uniqueId && a.pProxy1.uniqueId == b.pProxy1.uniqueId);
    return result? -1 : 1;
  }
  Bullet.poolCollisionAlgorithm=new Bullet.ObjectPool(function() {
    return new Bullet.CollisionAlgorithm();
  }
  );
  Bullet.CollisionAlgorithmCreateFunc=function(simplexSolver,pdSolver) {
    this.simplexSolver = simplexSolver;
    this.pdSolver = pdSolver;
  }
  Bullet.CollisionAlgorithmCreateFunc.prototype.swapped=false;
  Bullet.CollisionAlgorithmCreateFunc.prototype.pool = Bullet.poolCollisionAlgorithm;
  Bullet.CollisionAlgorithmCreateFunc.prototype.createCollisionAlgorithm=function(ci,body0,body1) {
    var algo = this.pool.get();//new ConvexConvexAlgorithm();//pool.get();
    algo.init6(ci.manifold, ci, body0, body1, this.simplexSolver,this.pdSolver);
    return algo;
  }
  Bullet.CollisionAlgorithmCreateFunc.prototype.releaseCollisionAlgorithm=function(algo) {
    pool.release(algo);
  }
  Bullet.poolClosestPointInput=new Bullet.ObjectPool(function() {
    return new Bullet.ClosestPointInput();
  }
  );
  Bullet.CollisionAlgorithm=function() {}
  Bullet.CollisionAlgorithm.prototype.init1=function(ci) {
    this.dispatcher = ci.dispatcher1;
  }
  Bullet.CollisionAlgorithm.prototype.pointInputsPool = Bullet.poolClosestPointInput;
  Bullet.CollisionAlgorithm.prototype.gjkPairDetector = new Bullet.GjkPairDetector();
  Bullet.CollisionAlgorithm.prototype.ownManifold=false;
  Bullet.CollisionAlgorithm.prototype.init6=function(mf,ci,body0,body1,simplexSolver,pdSolver) {
    this.init1(ci);
    this.gjkPairDetector.init(null, null, simplexSolver, pdSolver);
    this.manifoldPtr = mf;
    this.ownManifold = false;
    this.lowLevelOfDetail = false;
  }
  Bullet.CollisionAlgorithm.prototype.processCollision=function(body0,body1,dispatchInfo,resultOut) {
    if (this.manifoldPtr == null) {
      // swapped?
      this.manifoldPtr = this.dispatcher.getNewManifold(body0, body1);
      this.ownManifold = true;
    }
    resultOut.setPersistentManifold(this.manifoldPtr);
    var min0 = body0.collisionShape;
    var min1 = body1.collisionShape;
        
    var input = this.pointInputsPool.get();
    input.init();
        
    // JAVA NOTE: original: TODO: if (dispatchInfo.m_useContinuous)
    this.gjkPairDetector.minkowskiA=min0;//setMinkowskiA(min0);
    this.gjkPairDetector.minkowskiB=min1;//setMinkowskiB(min1);
    input.maximumDistanceSquared = min0.getMargin() + min1.getMargin() + Bullet.BulletGlobals.contactBreakingThreshold;
    input.maximumDistanceSquared *= input.maximumDistanceSquared;
    
    
    body0.getWorldTransform(input.transformA);
    body1.getWorldTransform(input.transformB);
    
    //if (body0.worldTransform==body1.worldTransform) throw new Error("same worldtransforms: "+body0.worldTransform+" "+body1.worldTransform);
       
                
    this.gjkPairDetector.getClosestPoints(input, resultOut);
    this.pointInputsPool.release(input);
    if (this.ownManifold) {
      resultOut.refreshContactPoints();
    }
  }
  Bullet.CollisionAlgorithm.prototype.disableCcd = false;
  Bullet.CollisionConfiguration=function() {
    this.simplexSolver = new Bullet.SimplexSolver();
    this.pdSolver = new Bullet.GjkEpaPenetrationDepthSolver();
    this.convexConvexCreateFunc = new Bullet.CollisionAlgorithmCreateFunc(this.simplexSolver,this.pdSolver);
  }
  Bullet.CollisionConfiguration.prototype.simplexSolver;
  Bullet.CollisionConfiguration.prototype.pdSolver;
  Bullet.CollisionConfiguration.prototype.convexConvexCreateFunc;
  Bullet.CollisionConfiguration.prototype.convexConcaveCreateFunc;
  Bullet.CollisionConfiguration.prototype.swappedConvexConcaveCreateFunc;
  Bullet.CollisionConfiguration.prototype.compoundCreateFunc;
  Bullet.CollisionConfiguration.prototype.swappedCompoundCreateFunc;
  Bullet.CollisionConfiguration.prototype.emptyCreateFunc;
  Bullet.CollisionConfiguration.prototype.sphereSphereCF;
  Bullet.CollisionConfiguration.prototype.sphereBoxCF;
  Bullet.CollisionConfiguration.prototype.boxSphereCF;
  Bullet.CollisionConfiguration.prototype.boxBoxCF;
  Bullet.CollisionConfiguration.prototype.sphereTriangleCF;
  Bullet.CollisionConfiguration.prototype.triangleSphereCF;
  Bullet.CollisionConfiguration.prototype.planeConvexCF;
  Bullet.CollisionConfiguration.prototype.convexPlaneCF;
  Bullet.CollisionConfiguration.prototype.getCollisionAlgorithmCreateFunc=function(proxyType0,proxyType1) {
    if ((proxyType0 == Bullet.BroadphaseNativeType.SPHERE_SHAPE_PROXYTYPE) && (proxyType1 == Bullet.BroadphaseNativeType.SPHERE_SHAPE_PROXYTYPE)) {
      return this.sphereSphereCF;
    }
    if (Bullet.BroadphaseNativeType.isConvex(proxyType0) && (proxyType1 == Bullet.BroadphaseNativeType.STATIC_PLANE_PROXYTYPE)) {
      return this.convexPlaneCF;
    }
       
    if (Bullet.BroadphaseNativeType.isConvex(proxyType1) && (proxyType0 == Bullet.BroadphaseNativeType.STATIC_PLANE_PROXYTYPE)) {
      return this.planeConvexCF;
    }
    if (Bullet.BroadphaseNativeType.isConvex(proxyType0) && Bullet.BroadphaseNativeType.isConvex(proxyType1)) {
      return this.convexConvexCreateFunc;
    }
        
    if (Bullet.BroadphaseNativeType.isConvex(proxyType0) && Bullet.BroadphaseNativeType.isConcave(proxyType1)) {
      return this.convexConcaveCreateFunc;
    }
    if (Bullet.BroadphaseNativeType.isConvex(proxyType1) && Bullet.BroadphaseNativeType.isConcave(proxyType0)) {
      return this.swappedConvexConcaveCreateFunc;
    }
    if (Bullet.BroadphaseNativeType.isCompound(proxyType0)) {
      return this.compoundCreateFunc;
    } else {
      if (Bullet.BroadphaseNativeType.isCompound(proxyType1)) {
        return this.swappedCompoundCreateFunc;
      }
    }
    return this.emptyCreateFunc;
  }
  Bullet.NearCallback=function() {
    this.contactPointResult=new Bullet.ManifoldResult();
  }
  Bullet.NearCallback.prototype.handleCollision=function(collisionPair,dispatcher,dispatchInfo) {
    var colObj0 = collisionPair.pProxy0.clientObject;
    var colObj1 = collisionPair.pProxy1.clientObject;
        
    if (dispatcher.needsCollision(colObj0, colObj1)) {
      // dispatcher will keep algorithms persistent in the collision pair
      if (collisionPair.algorithm == null) {
        collisionPair.algorithm = dispatcher.findAlgorithm2(colObj0, colObj1);
      }
      if (collisionPair.algorithm != null) {
        //ManifoldResult contactPointResult = new ManifoldResult(colObj0, colObj1);
        this.contactPointResult.init(colObj0, colObj1);
        if (dispatchInfo.dispatchFunc == Bullet.DispatchFunc.DISPATCH_DISCRETE) {
          // discrete collision detection query
          collisionPair.algorithm.processCollision(colObj0, colObj1, dispatchInfo,this.contactPointResult);
        } else {
          // continuous collision detection query, time of impact (toi)
          //if (1==1) throw new Error("n/i");
        }
      }
    }
  }
  Bullet.CollisionPairCallback=function() {}
  Bullet.CollisionPairCallback.prototype.init=function(dispatchInfo,dispatcher) {
    this.dispatchInfo = dispatchInfo;
    this.dispatcher = dispatcher;
  }
  Bullet.CollisionPairCallback.prototype.processOverlap=function(pair) {
    this.dispatcher.nearCallback.handleCollision(pair,this.dispatcher,this.dispatchInfo);
    return false;
  }
  Bullet.poolPersistentManifold=new Bullet.ObjectPool(function() {
    return new Bullet.PersistentManifold();
  }
  );
  Bullet.Dispatcher=function(collisionConfiguration) {
    this.manifoldsPtr=new Array();
    this.doubleDispatch=Bullet.arrayCreate([Bullet.Dispatcher.MAX_BROADPHASE_COLLISION_TYPES,Bullet.Dispatcher.MAX_BROADPHASE_COLLISION_TYPES]);
    this.tmpCI = new Bullet.CollisionAlgorithmConstructionInfo();
    this.collisionPairCallback = new Bullet.CollisionPairCallback();
    
    this.collisionConfiguration = collisionConfiguration;
    this.nearCallback=new Bullet.NearCallback();
      
    for (var i = 0; i < Bullet.Dispatcher.MAX_BROADPHASE_COLLISION_TYPES; i++) {
      for (var j = 0; j < Bullet.Dispatcher.MAX_BROADPHASE_COLLISION_TYPES; j++) {
        this.doubleDispatch[i][j] = collisionConfiguration.getCollisionAlgorithmCreateFunc(i,j);
      }
    }
  }
  Bullet.Dispatcher.prototype.manifoldsPool=Bullet.poolPersistentManifold;
  Bullet.Dispatcher.MAX_BROADPHASE_COLLISION_TYPES = Bullet.BroadphaseNativeType.MAX_BROADPHASE_COLLISION_TYPES;
  Bullet.Dispatcher.prototype.count = 0;
  Bullet.Dispatcher.prototype.useIslands = true;
  Bullet.Dispatcher.prototype.staticWarningReported = false;
  Bullet.Dispatcher.prototype.findAlgorithm2=function(body0,body1) {
    return this.findAlgorithm3(body0, body1, null);
  }
  Bullet.Dispatcher.prototype.findAlgorithm3=function(body0,body1,sharedManifold) {
    var ci=this.tmpCI;
    ci.dispatcher1 = this;
    ci.manifold = sharedManifold;
    var createFunc = this.doubleDispatch[body0.collisionShape.getShapeType()][body1.collisionShape.getShapeType()];
    var algo = createFunc.createCollisionAlgorithm(ci, body0, body1);
    algo.createFunc=createFunc;
    return algo;
  }
  Bullet.Dispatcher.prototype.getNewManifold=function(b0,b1) {
    var body0 = b0;
    var body1 = b1;
        
    var manifold = this.manifoldsPool.get();//new PersistentManifold();//manifoldsPool.get();
    manifold.init(body0,body1,0);
        
    manifold.index1a = this.manifoldsPtr.length;
    this.manifoldsPtr.push(manifold);
    return manifold;
  }
  Bullet.Dispatcher.prototype.needsCollision=function(body0,body1) {
    var needsCollision = true;
    
    if (!this.staticWarningReported) {
      if ((body0.isStaticObject() || body0.isKinematicObject()) &&
    (body1.isStaticObject() || body1.isKinematicObject())) {
      this.staticWarningReported = true;
      alert("warning Dispatcher.needsCollision: static-static collision!");
    }
    }
    if ((!body0.isActive()) && (!body1.isActive())) {
      needsCollision = false;
    }
    return needsCollision;
  }
  Bullet.Dispatcher.prototype.needsResponse=function(body0,body1) {
    //here you can do filtering
    var hasResponse = (body0.hasContactResponse() && body1.hasContactResponse());
    //no response between two static/kinematic bodies:
    hasResponse = hasResponse && ((!body0.isStaticOrKinematicObject()) || (!body1.isStaticOrKinematicObject()));
    return hasResponse;
  }
  Bullet.Dispatcher.prototype.dispatchAllCollisionPairs=function(pairCache,dispatchInfo,dispatcher) {
    this.collisionPairCallback.init(dispatchInfo,this);
    pairCache.processAllOverlappingPairs(this.collisionPairCallback,dispatcher);
  }
  Bullet.Dispatcher.prototype.getNumManifolds=function() {
    return this.manifoldsPtr.length;
  }
  Bullet.Dispatcher.prototype.getManifoldByIndexInternal=function(index) {
    return this.manifoldsPtr[index];
  }
  Bullet.SimulationIslandManager=function() {
    this.unionFind = new Bullet.UnionFind();
    this.islandmanifold = new Array();
    this.islandBodies = new Array();
  }
  Bullet.SimulationIslandManager.prototype.initUnionFind=function(n) {
    this.unionFind.reset(n);
  }
  Bullet.SimulationIslandManager.prototype.findUnions=function(dispatcher,colWorld) {
    var pairPtr = colWorld.getPairCache().overlappingPairArray;
    for (var i=0; i<pairPtr.sizef(); i++) {
      var collisionPair = pairPtr.get(i);
      var colObj0 = collisionPair.pProxy0.clientObject;
      var colObj1 = collisionPair.pProxy1.clientObject;
    
      if (((colObj0 != null) && ((colObj0).mergesSimulationIslands())) &&
    ((colObj1 != null) && ((colObj1).mergesSimulationIslands()))) {
      this.unionFind.unite((colObj0).islandTag1, (colObj1).islandTag1);
    }
    }
  }
  Bullet.SimulationIslandManager.prototype.updateActivationState=function(colWorld,dispatcher) {
    this.initUnionFind(colWorld.collisionObjects.length);
    // put the index into m_controllers into m_tag
    {
    var index = 0;
    var i;
    for (i = 0; i < colWorld.collisionObjects.length; i++) {
      var collisionObject = colWorld.collisionObjects[i];
      collisionObject.islandTag1=index;
      collisionObject.companionId=-1;
      collisionObject.hitFraction=1;
      index++;
    }
    }
    // do the union find
    this.findUnions(dispatcher, colWorld);
  }
  Bullet.SimulationIslandManager.prototype.storeIslandActivationState=function(colWorld) {
    // put the islandId ('find' value) into m_tag
    {
    var index = 0;
    var i;
    for (i = 0; i < colWorld.collisionObjects.length; i++) {
      var collisionObject = colWorld.collisionObjects[i];
      if (collisionObject.mergesSimulationIslands()) {
        collisionObject.islandTag1=this.unionFind.find(index);
        collisionObject.companionId=-1;
      } else {
        collisionObject.islandTag1=-1;
        collisionObject.companionId=-2;
      }
      index++;
    }
    }
  }
  Bullet.SimulationIslandManager.getIslandId=function(lhs) {
    var islandId;
    var rcolObj0 = lhs.body0;
    var rcolObj1 = lhs.body1;
    islandId = rcolObj0.islandTag1 >= 0? rcolObj0.islandTag1 : rcolObj1.islandTag1;
    return islandId;
  }
  Bullet.SimulationIslandManager.prototype.buildAndProcessIslands=function(dispatcher,collisionObjects,callback) {
    try {
    // we are going to sort the unionfind array, and store the element id in the size
    // afterwards, we clean unionfind, to make sure no-one uses it anymore
    this.unionFind.sortIslands();
    var numElem = this.unionFind.getNumElements();
    var endIslandIndex = 1;
    var startIslandIndex;
    
    // update the sleeping state for bodies, if all are sleeping
    for (startIslandIndex = 0; startIslandIndex < numElem; startIslandIndex = endIslandIndex) {
      var islandId = this.unionFind.getElement(startIslandIndex).id;
      for (endIslandIndex = startIslandIndex + 1; (endIslandIndex < numElem) && 
    (this.unionFind.getElement(endIslandIndex).id == islandId); endIslandIndex++)
      var allSleeping = true;
      var idx;
      for (idx = startIslandIndex; idx < endIslandIndex; idx++) {
        var i = this.unionFind.getElement(idx).sz;
        var colObj0 = collisionObjects[i];
        if ((colObj0.islandTag1 != islandId) && (colObj0.islandTag1 != -1)) {
          //System.err.println("error in island management\n");
        }
        
        if (colObj0.islandTag1 == islandId) {
          if (colObj0.activationState1 == Bullet.CollisionObject.ACTIVE_TAG) {
            allSleeping = false;
          }
          if (colObj0.activationState1 == Bullet.CollisionObject.DISABLE_DEACTIVATION) {
            allSleeping = false;
          }
        }
      }
        
      if (allSleeping) {
        var idx;
        for (idx = startIslandIndex; idx < endIslandIndex; idx++) {
          var i = this.unionFind.getElement(idx).sz;
          var colObj0 = collisionObjects[i];
          if ((colObj0.islandTag1 != islandId) && (colObj0.islandTag1 != -1)) {
            //System.err.println("error in island management\n");
          }
        
          if (colObj0.islandTag1 == islandId) {
            colObj0.setActivationState(Bullet.CollisionObject.ISLAND_SLEEPING);
          }
        }
      } else {
        for (idx = startIslandIndex; idx < endIslandIndex; idx++) {
          var i = this.unionFind.getElement(idx).sz;
          var colObj0 = collisionObjects[i];
          if ((colObj0.islandTag1 != islandId) && (colObj0.islandTag1 != -1)) {
            //System.err.println("error in island management\n");
          }
    
          if (colObj0.islandTag1 == islandId) {
            if (colObj0.activationState1 == Bullet.CollisionObject.ISLAND_SLEEPING) {
              colObj0.setActivationState(Bullet.CollisionObject.WANTS_DEACTIVATION);
            }
          }
        }
      }
    }
    var i;
    var maxNumManifolds = dispatcher.getNumManifolds();
    for (i = 0; i < maxNumManifolds; i++) {
      var manifold = dispatcher.getManifoldByIndexInternal(i);
        
      var colObj0 =manifold.body0;
      var colObj1 =manifold.body1;
        
      // todo: check sleeping conditions!
      if (((colObj0 != null) && colObj0.activationState1 != Bullet.CollisionObject.ISLAND_SLEEPING) ||
    ((colObj1 != null) && colObj1.activationState1 != Bullet.CollisionObject.ISLAND_SLEEPING)) {
      
      // kinematic objects don't merge islands, but wake up all connected objects
      if (colObj0.isKinematicObject() && colObj0.activationState1 != Bullet.CollisionObject.ISLAND_SLEEPING) {
       colObj1.activate();
      }
      if (colObj1.isKinematicObject() && colObj1.activationState1 != Bullet.CollisionObject.ISLAND_SLEEPING) {
       colObj0.activate();
      }
      if (dispatcher.needsResponse(colObj0, colObj1)) {
       this.islandmanifold.push(manifold);
      }
    }
    }
    var numManifolds = this.islandmanifold.length;
    // we should do radix sort, it it much faster (O(n) instead of O (n log2(n))
    //islandmanifold.heapSort(btPersistentManifoldSortPredicate());
    // JAVA NOTE: memory optimized sorting with caching of temporary array
    //Collections.sort(islandmanifold, persistentManifoldComparator);
    Bullet.MiscUtil.quickSort(this.islandmanifold,Bullet.SimulationIslandManager.persistentManifoldComparator);
    // now process all active islands (sets of manifolds for now)
    var startManifoldIndex = 0;
    var endManifoldIndex = 1;
        
    for (startIslandIndex = 0; startIslandIndex < numElem; startIslandIndex = endIslandIndex) {
      var islandId = this.unionFind.getElement(startIslandIndex).id;
      var islandSleeping = false;
        
      for (endIslandIndex = startIslandIndex; (endIslandIndex < numElem) && (this.unionFind.getElement(endIslandIndex).id == islandId); endIslandIndex++) {
        i = this.unionFind.getElement(endIslandIndex).sz;
        var colObj0 = collisionObjects[i];
        this.islandBodies.push(colObj0);
        if (!colObj0.isActive()) {
          islandSleeping = true;
        }
      }
    
      // find the accompanying contact manifold for this islandId
      var numIslandManifolds = 0;
      var startManifold_idx = -1;
    
      if (startManifoldIndex < numManifolds) {
        var curIslandId = Bullet.SimulationIslandManager.getIslandId(this.islandmanifold[startManifoldIndex]);
        if (curIslandId == islandId) {
          startManifold_idx = startManifoldIndex;
          for (endManifoldIndex = startManifoldIndex + 1; (endManifoldIndex < numManifolds) && (islandId == Bullet.SimulationIslandManager.getIslandId(this.islandmanifold[endManifoldIndex])); endManifoldIndex++) {
          }
          // Process the actual simulation, only if not sleeping/deactivated
          numIslandManifolds = endManifoldIndex - startManifoldIndex;
        }
      }
        
      if (!islandSleeping) {
        callback.processIsland(this.islandBodies,this.islandBodies.length,this.islandmanifold,startManifold_idx,numIslandManifolds,islandId);
      }
      if (numIslandManifolds != 0) {
        startManifoldIndex = endManifoldIndex;
      }
      this.islandBodies.splice(0,this.islandBodies.length);//clear();
    }
    this.islandmanifold.splice(0,this.islandmanifold.length);//clear
    } finally {
    }
  }
  Bullet.SimulationIslandManager.persistentManifoldComparator=function(lhs,rhs) {
    return Bullet.SimulationIslandManager.getIslandId(lhs) < Bullet.SimulationIslandManager.getIslandId(rhs)? -1 : +1;
  }
  Bullet.SolverMode={
    SOLVER_RANDMIZE_ORDER    : 1,
    SOLVER_FRICTION_SEPARATE : 2,
    SOLVER_USE_WARMSTARTING  : 4,
    SOLVER_CACHE_FRIENDLY    : 8};
  Bullet.ContactSolverInfo=function() {}
  Bullet.ContactSolverInfo.prototype.tau = 0.6;
  Bullet.ContactSolverInfo.prototype.damping = 1;
  Bullet.ContactSolverInfo.prototype.friction = 0.3;
  Bullet.ContactSolverInfo.prototype.timeStep;
  Bullet.ContactSolverInfo.prototype.restitution = 0;
  Bullet.ContactSolverInfo.prototype.numIterations = 10;
  Bullet.ContactSolverInfo.prototype.maxErrorReduction = 20;
  Bullet.ContactSolverInfo.prototype.sor = 1.3;
  Bullet.ContactSolverInfo.prototype.erp = 0.2; // used as Baumgarte factor
  Bullet.ContactSolverInfo.prototype.erp2 = 0.1; // used in Split Impulse
  Bullet.ContactSolverInfo.prototype.splitImpulse = false;
  Bullet.ContactSolverInfo.prototype.splitImpulsePenetrationThreshold = -0.02;
  Bullet.ContactSolverInfo.prototype.linearSlop = 0;
  Bullet.ContactSolverInfo.prototype.warmstartingFactor = 0.85;
  Bullet.ContactSolverInfo.prototype.solverMode = Bullet.SolverMode.SOLVER_RANDMIZE_ORDER | Bullet.SolverMode.SOLVER_CACHE_FRIENDLY | Bullet.SolverMode.SOLVER_USE_WARMSTARTING;
  Bullet.ConstraintPersistentData=function() {
    this.frictionWorldTangential0 = new Vecmath.Vec3();
    this.frictionWorldTangential1 = new Vecmath.Vec3(); 
    this.frictionAngularComponent0A = new Vecmath.Vec3();
    this.frictionAngularComponent0B = new Vecmath.Vec3();
    this.frictionAngularComponent1A = new Vecmath.Vec3();
    this.frictionAngularComponent1B = new Vecmath.Vec3();
    this.angularComponentA = new Vecmath.Vec3();
    this.angularComponentB = new Vecmath.Vec3();
  }
  Bullet.ConstraintPersistentData.prototype.appliedImpulse = 0;
  Bullet.ConstraintPersistentData.prototype.prevAppliedImpulse = 0;
  Bullet.ConstraintPersistentData.prototype.accumulatedTangentImpulse0 = 0;
  Bullet.ConstraintPersistentData.prototype.accumulatedTangentImpulse1 = 0;
  Bullet.ConstraintPersistentData.prototype.jacDiagABInv = 0;
  Bullet.ConstraintPersistentData.prototype.jacDiagABInvTangent0;
  Bullet.ConstraintPersistentData.prototype.jacDiagABInvTangent1;
  Bullet.ConstraintPersistentData.prototype.persistentLifeTime = 0;
  Bullet.ConstraintPersistentData.prototype.restitution = 0;
  Bullet.ConstraintPersistentData.prototype.friction = 0;
  Bullet.ConstraintPersistentData.prototype.penetration = 0;
  Bullet.SolverBody=function() {
    this.angularVelocity = new Vecmath.Vec3();
    this.linearVelocity = new Vecmath.Vec3();
    this.centerOfMassPosition = new Vecmath.Vec3();
    this.pushVelocity = new Vecmath.Vec3();
    this.turnVelocity = new Vecmath.Vec3();
  }
  Bullet.SolverBody.prototype.angularFactor;
  Bullet.SolverBody.prototype.invMass;
  Bullet.SolverBody.prototype.friction;
  Bullet.SolverBody.prototype.originalBody;
  Bullet.SolverBody.prototype.internalApplyImpulse=function(linearComponent,angularComponent,impulseMagnitude) {
    if (this.invMass != 0) {
      this.linearVelocity.scaleAdd(impulseMagnitude, linearComponent,this.linearVelocity);
      this.angularVelocity.scaleAdd(impulseMagnitude * this.angularFactor, angularComponent,this.angularVelocity);
    }
  }
  Bullet.SolverBody.prototype.writebackVelocity=function() {
    if (this.invMass != 0) {
      this.originalBody.setLinearVelocity(this.linearVelocity);
      this.originalBody.setAngularVelocity(this.angularVelocity);
    }
  }
  Bullet.SolverBody.prototype.readVelocity=function() {
    if (invMass != 0) {
      this.originalBody.getLinearVelocity(this.linearVelocity);
      this.originalBody.getAngularVelocity(this.angularVelocity);
    }
  }
  Bullet.RigidBodyConstructionInfo=function(mass,motionState,collisionShape,localInertia) {
    this.startWorldTransform = new Bullet.Transform();
    this.localInertia = new Vecmath.Vec3();
    this.mass = mass;
    this.motionState = motionState;
    this.collisionShape = collisionShape;
    this.localInertia.set1(localInertia);
    this.startWorldTransform.setIdentity();
  }
  Bullet.RigidBodyConstructionInfo.prototype.mass;
  Bullet.RigidBodyConstructionInfo.prototype.motionState;
  Bullet.RigidBodyConstructionInfo.prototype.collisionShape;
  Bullet.RigidBodyConstructionInfo.prototype.linearDamping = 0;
  Bullet.RigidBodyConstructionInfo.prototype.angularDamping = 0;
  Bullet.RigidBodyConstructionInfo.prototype.friction = 0.5;//best non zero
  Bullet.RigidBodyConstructionInfo.prototype.restitution = 0;//best zero
  Bullet.RigidBodyConstructionInfo.prototype.linearSleepingThreshold = 0.8;
  Bullet.RigidBodyConstructionInfo.prototype.angularSleepingThreshold = 1.0;
  Bullet.RigidBodyConstructionInfo.prototype.additionalDamping = false;
  Bullet.RigidBodyConstructionInfo.prototype.additionalDampingFactor = 0.005;
  Bullet.RigidBodyConstructionInfo.prototype.additionalLinearDampingThresholdSqr = 0.01;
  Bullet.RigidBodyConstructionInfo.prototype.additionalAngularDampingThresholdSqr = 0.01;
  Bullet.RigidBodyConstructionInfo.prototype.additionalAngularDampingFactor = 0.01;
  Bullet.RigidBody=function(constructionInfo) {
    //---collsisionobject constr
    this.worldTransform = new Bullet.Transform();
    this.interpolationWorldTransform = new Bullet.Transform();
    this.interpolationLinearVelocity = new Vecmath.Vec3();
    this.interpolationAngularVelocity = new Vecmath.Vec3();
    this.collisionFlags = Bullet.CollisionFlags.STATIC_OBJECT;
    this.islandTag1 = -1;
    this.companionId = -1;
    this.activationState1 = 1;
    this.friction = 0.5;
    this.hitFraction = 1;
    //---
    this.invInertiaTensorWorld = new Vecmath.Mat3();
    this.linearVelocity = new Vecmath.Vec3();
    this.angularVelocity = new Vecmath.Vec3();
    this.gravity = new Vecmath.Vec3();
    this.invInertiaLocal = new Vecmath.Vec3();
    this.totalForce = new Vecmath.Vec3();
    this.totalTorque = new Vecmath.Vec3();
    this.constraintRefs = new Array();
    this.dir=new Vecmath.Vec3();
    this.tmp=new Vecmath.Vec3();
    this.t0=new Vecmath.Vec3();
    this.t1=new Vecmath.Vec3();
    this.mat1=new Vecmath.Mat3();
    this.mat2=new Vecmath.Mat3();
    //--
    this.setupRigidBody(constructionInfo);
  }
  Bullet.RigidBody.prototype=new Bullet.CollisionObject();
  Bullet.RigidBody.MAX_ANGVEL = Bullet.BulletGlobals.SIMD_HALF_PI;
  // optionalMotionState allows to automatic synchronize the world transform for active objects
  Bullet.RigidBody.prototype.optionalMotionState;
  // for experimental overriding of friction/contact solver func
  Bullet.RigidBody.prototype.contactSolverType;
  Bullet.RigidBody.prototype.frictionSolverType;
  Bullet.RigidBody.uniqueId = 0;
  Bullet.RigidBody.prototype.debugBodyId;
  Bullet.RigidBody.prototype.setupRigidBody=function(constructionInfo) {
    this.internalType = Bullet.CollisionObjectType.RIGID_BODY;
    this.linearVelocity.set3(0,0,0);
    this.angularVelocity.set3(0,0,0);
    this.angularFactor = 1;
    this.gravity.set3(0,0,0);
    this.totalForce.set3(0,0,0);
    this.totalTorque.set3(0,0,0);
    this.linearDamping = 0;
    this.angularDamping = 0.5;
    this.linearSleepingThreshold = constructionInfo.linearSleepingThreshold;
    this.angularSleepingThreshold = constructionInfo.angularSleepingThreshold;
    this.optionalMotionState = constructionInfo.motionState;
    this.contactSolverType = 0;
    this.frictionSolverType = 0;
    this.additionalDamping = constructionInfo.additionalDamping;
    this.additionalDampingFactor = constructionInfo.additionalDampingFactor;
    this.additionalLinearDampingThresholdSqr = constructionInfo.additionalLinearDampingThresholdSqr;
    this.additionalAngularDampingThresholdSqr = constructionInfo.additionalAngularDampingThresholdSqr;
    this.additionalAngularDampingFactor = constructionInfo.additionalAngularDampingFactor;
    if (this.optionalMotionState != null) {
      this.optionalMotionState.getWorldTransform(this.worldTransform);
    } else {
      this.worldTransform.setT(constructionInfo.startWorldTransform);
    }
        
    this.interpolationWorldTransform.setT(this.worldTransform);
    this.interpolationLinearVelocity.set3(0,0,0);
    this.interpolationAngularVelocity.set3(0,0,0);
        
    // moved to CollisionObject
    this.friction = constructionInfo.friction;
    this.restitution = constructionInfo.restitution;
        
    this.setCollisionShape(constructionInfo.collisionShape);
    this.debugBodyId = Bullet.RigidBody.uniqueId++;
       
    this.setMassProps(constructionInfo.mass, constructionInfo.localInertia);
    this.setDamping(constructionInfo.linearDamping, constructionInfo.angularDamping);
    this.updateInertiaTensor();
  }
  Bullet.RigidBody.prototype.proceedToTransform=function(newTrans) {
    this.setCenterOfMassTransform(newTrans);
  }
  Bullet.RigidBody.upcast=function(colObj) {
    if (colObj.internalType == Bullet.CollisionObjectType.RIGID_BODY) {
      return colObj;
    }
    return null;
  }
  Bullet.RigidBody.prototype.predictIntegratedTransform=function(timeStep,predictedTransform) {
    Bullet.TransformUtil.integrateTransform(this.worldTransform,this.linearVelocity,this.angularVelocity,timeStep,predictedTransform);
  }
  Bullet.RigidBody.prototype.applyGravity=function() {
    if (this.isStaticOrKinematicObject())
      return;
    this.applyCentralForce(this.gravity);
  }
  Bullet.RigidBody.prototype.setGravity=function(acceleration) {
    if (this.inverseMass != 0) {
      this.gravity.scale2(1/this.inverseMass,acceleration);
    }
  }
  Bullet.RigidBody.prototype.setDamping=function(lin_damping,ang_damping) {
    this.linearDamping = Bullet.MiscUtil.GEN_clamped(lin_damping, 0, 1);
    this.angularDamping = Bullet.MiscUtil.GEN_clamped(ang_damping, 0, 1);
  }
  Bullet.RigidBody.prototype.applyDamping=function(timeStep) {
    this.linearVelocity.scale1(Bullet.MiscUtil.GEN_clamped((1 - timeStep * this.linearDamping),0,1));
    this.angularVelocity.scale1(Bullet.MiscUtil.GEN_clamped((1 - timeStep * this.angularDamping),0,1));
        
    if (this.additionalDamping) {
      // Additional damping can help avoiding lowpass jitter motion, help stability for ragdolls etc.
      // Such damping is undesirable, so once the overall simulation quality of the rigid body dynamics system has improved, this should become obsolete
      if ((this.angularVelocity.lengthSquared() < this.additionalAngularDampingThresholdSqr) &&
    (this.linearVelocity.lengthSquared() < this.additionalLinearDampingThresholdSqr)) {
      this.angularVelocity.scale(this.additionalDampingFactor);
      this.linearVelocity.scale(this.additionalDampingFactor);
    }
        
      var speed = this.linearVelocity.length();
      if (speed < this.linearDamping) {
        var dampVel = 0.005;
        if (speed > dampVel) {
          this.dir.set1(this.linearVelocity);//Vector3f dir = Stack._alloc(linearVelocity);
          this.dir.normalize();
          this.dir.scale(dampVel);
          this.linearVelocity.sub(this.dir);
        } else {
          this.linearVelocity.set(0,0,0);
        }
      }
      var angSpeed = this.angularVelocity.length();
      if (angSpeed < this.angularDamping) {
        var angDampVel = 0.005;
        if (angSpeed > angDampVel) {
          this.dir.set1(this.angularVelocity);//Vector3f dir = Stack._alloc(angularVelocity);
          this.dir.normalize();
          this.dir.scale(angDampVel);
          this.angularVelocity.sub(dir);
        } else {
          this.angularVelocity.set(0,0,0);
        }
      }
    }
  }
  Bullet.RigidBody.prototype.setMassProps=function(mass,inertia) {
    if (mass == 0) {
      this.collisionFlags |= Bullet.CollisionFlags.STATIC_OBJECT;
      this.inverseMass = 0;
    } else {
      this.collisionFlags &= (~Bullet.CollisionFlags.STATIC_OBJECT);
      this.inverseMass = 1 / mass;
    }
        
    this.invInertiaLocal.set3(inertia.x != 0 ? 1 / inertia.x : 0,
      inertia.y != 0 ? 1 / inertia.y : 0,
      inertia.z != 0 ? 1 / inertia.z : 0);
  }
  Bullet.RigidBody.prototype.getInvInertiaTensorWorld=function(out) {
    out.set1(this.invInertiaTensorWorld);
    return out;
  }
  Bullet.RigidBody.prototype.integrateVelocities=function(step) {
    if (this.isStaticOrKinematicObject()) {
      return;
    }
    //ullet.log("RigidBody.integrateVelocities "+this.linearVelocity+" step="+step+" invmass="+this.inverseMass+" step="+step+" totalforce="+this.totalForce);
    this.linearVelocity.scaleAdd(this.inverseMass * step,this.totalForce,this.linearVelocity);
    //ullet.log("RigidBody.integrateVelocities "+this.linearVelocity);
    
    this.tmp.set1(this.totalTorque);//Vector3f tmp = Stack._alloc(totalTorque);
    this.invInertiaTensorWorld.transform1(this.tmp);
    this.angularVelocity.scaleAdd(step,this.tmp,this.angularVelocity);
        
    // clamp angular velocity. collision calculations will fail on higher angular velocities
    var angvel = this.angularVelocity.length();
    if (angvel * step > Bullet.RigidBody.MAX_ANGVEL) {
      this.angularVelocity.scale((Bullet.RigidBody.MAX_ANGVEL / step) / angvel);
    }
    
  }
  Bullet.RigidBody.prototype.setCenterOfMassTransform=function(xform) {
    if (this.isStaticOrKinematicObject()) {
      this.interpolationWorldTransform.set(this.worldTransform);
    } else {
      this.interpolationWorldTransform.setT(xform);
    }
    this.getLinearVelocity(this.interpolationLinearVelocity);
    this.getAngularVelocity(this.interpolationAngularVelocity);
    this.worldTransform.setT(xform);
    this.updateInertiaTensor();
  }
  Bullet.RigidBody.prototype.applyCentralForce=function(force) {
    this.totalForce.add1(force);
  }
  Bullet.RigidBody.prototype.clearForces=function() {
    this.totalForce.set3(0,0,0);
    this.totalTorque.set3(0,0,0);
  }
  Bullet.RigidBody.prototype.updateInertiaTensor=function() {
    //mat1.set(MiscUtil.fa3);//Matrix3f mat1 = Stack._alloc(Matrix3f.class);
    Bullet.MatrixUtil.scale(this.mat1,this.worldTransform.basis,this.invInertiaLocal);
        
    this.mat2.set1(this.worldTransform.basis);//Matrix3f mat2 = Stack._alloc(worldTransform.basis);
    this.mat2.transpose();
        
    this.invInertiaTensorWorld.mul2(this.mat1,this.mat2);
  }
  Bullet.RigidBody.prototype.getLinearVelocity=function(out) {
    out.set1(this.linearVelocity);
    return out;
  }
  Bullet.RigidBody.prototype.getAngularVelocity=function(out) {
    out.set1(this.angularVelocity);
    return out;
  }
  Bullet.RigidBody.prototype.setLinearVelocity=function(lin_vel) {
    this.linearVelocity.set1(lin_vel);
  }
  Bullet.RigidBody.prototype.setAngularVelocity=function(ang_vel) {
    this.angularVelocity.set1(ang_vel);
  }
  Bullet.RigidBody.prototype.getVelocityInLocalPoint=function(rel_pos,out) {
    // we also calculate lin/ang velocity for kinematic objects
    var vec = out;
    vec.cross(this.angularVelocity, rel_pos);
    vec.add1(this.linearVelocity);
    return out;
    //for kinematic objects, we could also use use:
    //return (m_worldTransform(rel_pos) - m_interpolationWorldTransform(rel_pos)) / m_kinematicTimeStep;
  }
  Bullet.RigidBody.prototype.updateDeactivation=function(timeStep) {
    if ((this.activationState1 == Bullet.CollisionObject.ISLAND_SLEEPING) || (this.activationState1 == Bullet.CollisionObject.DISABLE_DEACTIVATION)) {
      return;
    }
        
    if ((this.getLinearVelocity(this.t0).lengthSquared() < this.linearSleepingThreshold * this.linearSleepingThreshold) &&
    (this.getAngularVelocity(this.t1).lengthSquared() < this.angularSleepingThreshold * this.angularSleepingThreshold)) {
      this.deactivationTime += timeStep;
    }
    else {
      this.deactivationTime = 0;
      this.setActivationState(0);
    }
  }
  Bullet.RigidBody.prototype.wantsSleeping=function() {
    if (this.activationState1 == Bullet.CollisionObject.DISABLE_DEACTIVATION) {
      return false;
    }
        
    // disable deactivation
    if (Bullet.BulletGlobals.disableDeactivation || (Bullet.BulletGlobals.deactivationTime == 0)) {
      return false;
    }
       
    if ((this.activationState1 == Bullet.CollisionObject.ISLAND_SLEEPING) || (this.activationState1 == Bullet.CollisionObject.WANTS_DEACTIVATION)) {
      return true;
    }
        
    if (this.deactivationTime > Bullet.BulletGlobals.deactivationTime) {
      return true;
    }
    return false;
  }
  Bullet.SolverConstraintType={
    SOLVER_CONTACT_1D:0,
    SOLVER_FRICTION_1D:1}
  Bullet.SolverConstraint=function() {
    this.relpos1CrossNormal = new Vecmath.Vec3();
    this.contactNormal = new Vecmath.Vec3();
    this.relpos2CrossNormal = new Vecmath.Vec3();
    this.angularComponentA = new Vecmath.Vec3();
    this.angularComponentB = new Vecmath.Vec3();
  }
  Bullet.ContactConstraintEnum={
    DEFAULT_CONTACT_SOLVER_TYPE:0,
    CONTACT_SOLVER_TYPE1:1,
    CONTACT_SOLVER_TYPE2:2,
    USER_CONTACT_SOLVER_TYPE1:3,
    MAX_CONTACT_SOLVER_TYPES:4}
  Bullet.OrderIndex=function() {}
  Bullet.OrderIndex.prototype.manifoldIndex=0;
  Bullet.OrderIndex.prototype.pointIndex=0;
  Bullet.poolSolverBody=new Bullet.ObjectPool(function() {
    return new Bullet.SolverBody();
  }
  );
  Bullet.poolSolverConstraint=new Bullet.ObjectPool(function() {
    return new Bullet.SolverConstraint();
  }
  );
  Bullet.ConstraintSolver=function() {
    this.gOrder = new Array(Bullet.ConstraintSolver.SEQUENTIAL_IMPULSE_MAX_SOLVER_POINTS);
    this.bodiesPool=Bullet.poolSolverBody;
    this.constraintsPool=Bullet.poolSolverConstraint;
    this.tmpSolverBodyPool = new Array();
    this.tmpSolverConstraintPool = new Array();
    this.tmpSolverFrictionConstraintPool = new Array();
    this.orderTmpConstraintPool = new Bullet.ObjectArrayList();
    this.orderFrictionConstraintPool = new Bullet.ObjectArrayList();
    this.tr0=new Bullet.Transform();
    this.tmp=new Vecmath.Vec3();
    this.ftorqueAxis1=new Vecmath.Vec3(),
    this.vec=new Vecmath.Vec3();
    this.tmpMat=new Vecmath.Mat3();
    this.tmpTrans=new Bullet.Transform();
    this.rel_pos1=new Vecmath.Vec3(),
    this.rel_pos2=new Vecmath.Vec3(),
    this.pos1=new Vecmath.Vec3(),
    this.pos2=new Vecmath.Vec3(),
    this.vel=new Vecmath.Vec3(),
    this.torqueAxis0=new Vecmath.Vec3(),
    this.torqueAxis1=new Vecmath.Vec3(),
    this.vel1=new Vecmath.Vec3(),
    this.vel2=new Vecmath.Vec3(),
    this.frictionDir1=new Vecmath.Vec3(),
    this.frictionDir2=new Vecmath.Vec3();
    
    
    
    for (var i=0; i<this.gOrder.length; i++) {
       this.gOrder[i] = new Bullet.OrderIndex();
    }
  }
  Bullet.ConstraintSolver.MAX_CONTACT_SOLVER_TYPES=Bullet.ContactConstraintEnum.MAX_CONTACT_SOLVER_TYPES;
  Bullet.ConstraintSolver.SEQUENTIAL_IMPULSE_MAX_SOLVER_POINTS = 16384;
  Bullet.ConstraintSolver.prototype.totalCpd=0;
  Bullet.ConstraintSolver.prototype.bodiesPool=Bullet.poolSolverBody;
  Bullet.ConstraintSolver.prototype.constraintsPool=Bullet.poolSolverConstraint;
  //  // btSeed2 is used for re-arranging the constraint rows. improves convergence/quality of friction
  Bullet.ConstraintSolver.prototype.btSeed2=0;
  Bullet.ConstraintSolver.prototype.prepareSolve=function(numBodies,numManifolds) {}
  Bullet.ConstraintSolver.prototype.allSolved=function(info) {}
  Bullet.ConstraintSolver.prototype.rand2=function() {
    this.btSeed2 = (1664525 * this.btSeed2 + 1013904223) & 0xffffffff;
    return this.btSeed2;
  }
  // See ODE: adam's all-int straightforward(?) dRandInt (0..n-1)
  Bullet.ConstraintSolver.prototype.randInt2=function(n) {
    // seems good; xor-fold and modulus
    var un = n;
    var r = this.rand2();
    // note: probably more aggressive than it needs to be -- might be
    //       able to get away without one or two of the innermost branches.
    if (un <= 0x00010000) {
      r ^= (r >>> 16);
      if (un <= 0x00000100) {
        r ^= (r >>> 8);
        if (un <= 0x00000010) {
          r ^= (r >>> 4);
          if (un <= 0x00000004) {
            r ^= (r >>> 2);
            if (un <= 0x00000002) {
              r ^= (r >>> 1);
            }
          }
        }
      }
    }
        
    // TODO: check modulo C vs Java mismatch
    return Math.abs(r % un);
  }
  Bullet.ConstraintSolver.prototype.initSolverBody=function(solverBody,collisionObject) {
    var rb = Bullet.RigidBody.upcast(collisionObject);
    if (rb != null) {
      rb.getAngularVelocity(solverBody.angularVelocity);
      solverBody.centerOfMassPosition.set1(collisionObject.getWorldTransform(this.tr0).origin);
      solverBody.friction = collisionObject.friction;
      solverBody.invMass = rb.inverseMass;
      rb.getLinearVelocity(solverBody.linearVelocity);
      solverBody.originalBody = rb;
      solverBody.angularFactor = rb.angularFactor;
    } else {
      solverBody.angularVelocity.set3(0, 0, 0);
      solverBody.centerOfMassPosition.set1(collisionObject.getWorldTransform(this.tr0).origin);
      solverBody.friction = collisionObject.friction;
      solverBody.invMass = 0;
      solverBody.linearVelocity.set3(0, 0, 0);
      solverBody.originalBody = null;
      solverBody.angularFactor = 1;
    }
        
    solverBody.pushVelocity.set3(0,0,0);
    solverBody.turnVelocity.set3(0,0,0);
  }
  Bullet.ConstraintSolver.prototype.restitutionCurve=function(rel_vel,restitution) {
    var rest = restitution * -rel_vel;
    return rest;
  }
  Bullet.ConstraintSolver.prototype.resolveSingleCollisionCombinedCacheFriendly=function(body1,body2,contactConstraint,solverInfo) {
    var normalImpulse;
    var useSplitImpulse = false;
        
    {
    var rel_vel;
    var vel1Dotn = contactConstraint.contactNormal.dot(body1.linearVelocity) + contactConstraint.relpos1CrossNormal.dot(body1.angularVelocity);
    var vel2Dotn = contactConstraint.contactNormal.dot(body2.linearVelocity) + contactConstraint.relpos2CrossNormal.dot(body2.angularVelocity);
        
    rel_vel = vel1Dotn - vel2Dotn;
        
    var positionalError = 0;
    if (!solverInfo.splitImpulse || (contactConstraint.penetration > solverInfo.splitImpulsePenetrationThreshold)) {
      positionalError = -contactConstraint.penetration * solverInfo.erp / solverInfo.timeStep;
    }
        
    var velocityError = contactConstraint.restitution - rel_vel;
        
    var penetrationImpulse = positionalError * contactConstraint.jacDiagABInv;
    var velocityImpulse = velocityError * contactConstraint.jacDiagABInv;
    normalImpulse = penetrationImpulse + velocityImpulse;
    
    // See Erin Catto's GDC 2006 paper: Clamp the accumulated impulse
    var oldNormalImpulse = contactConstraint.appliedImpulse;
    var sum = oldNormalImpulse + normalImpulse;
    contactConstraint.appliedImpulse = 0 > sum ? 0 : sum;
        
    normalImpulse = contactConstraint.appliedImpulse - oldNormalImpulse;
        
    this.tmp.scale2(body1.invMass, contactConstraint.contactNormal);
    body1.internalApplyImpulse(this.tmp, contactConstraint.angularComponentA, normalImpulse);
       
    this.tmp.scale2(body2.invMass, contactConstraint.contactNormal);
    body2.internalApplyImpulse(this.tmp, contactConstraint.angularComponentB, -normalImpulse);
    }
    return normalImpulse;
    
  }
  Bullet.ConstraintSolver.prototype.resolveSingleFrictionCacheFriendly=function(body1,body2,contactConstraint,solverInfo,appliedNormalImpulse) {
    var combinedFriction = contactConstraint.friction;
    var limit = appliedNormalImpulse * combinedFriction;
        
    if (appliedNormalImpulse > 0) //friction
      {
      var j1;
      {
        var rel_vel;
        var vel1Dotn = contactConstraint.contactNormal.dot(body1.linearVelocity) + contactConstraint.relpos1CrossNormal.dot(body1.angularVelocity);
        var vel2Dotn = contactConstraint.contactNormal.dot(body2.linearVelocity) + contactConstraint.relpos2CrossNormal.dot(body2.angularVelocity);
        rel_vel = vel1Dotn - vel2Dotn;
        
        // calculate j that moves us to zero relative velocity
        j1 = -rel_vel * contactConstraint.jacDiagABInv;
        var oldTangentImpulse = contactConstraint.appliedImpulse;
        contactConstraint.appliedImpulse = oldTangentImpulse + j1;
        
        if (limit < contactConstraint.appliedImpulse) {
          contactConstraint.appliedImpulse = limit;
        } else {
          if (contactConstraint.appliedImpulse < -limit) {
            contactConstraint.appliedImpulse = -limit;
          }
        }
        j1 = contactConstraint.appliedImpulse - oldTangentImpulse;
      }
      this.tmp.scale2(body1.invMass, contactConstraint.contactNormal);
      body1.internalApplyImpulse(this.tmp, contactConstraint.angularComponentA, j1);
        
      this.tmp.scale2(body2.invMass, contactConstraint.contactNormal);
      body2.internalApplyImpulse(this.tmp, contactConstraint.angularComponentB, -j1);
    }
    return 0;
  }
  Bullet.ConstraintSolver.prototype.addFrictionConstraint=function(normalAxis,solverBodyIdA,solverBodyIdB,frictionIndex,cp,rel_pos1,rel_pos2,colObj0,colObj1,relaxation) {
    var body0 = Bullet.RigidBody.upcast(colObj0);
    var body1 = Bullet.RigidBody.upcast(colObj1);
        
    var solverConstraint = this.constraintsPool.get();
    this.tmpSolverFrictionConstraintPool.push(solverConstraint);
        
    solverConstraint.contactNormal.set1(normalAxis);
        
    solverConstraint.solverBodyIdA = solverBodyIdA;
    solverConstraint.solverBodyIdB = solverBodyIdB;
    solverConstraint.constraintType = Bullet.SolverConstraintType.SOLVER_FRICTION_1D;
    solverConstraint.frictionIndex = frictionIndex;
        
    solverConstraint.friction = cp.combinedFriction;
    solverConstraint.originalContactPoint = null;
        
    solverConstraint.appliedImpulse = 0;
    solverConstraint.appliedPushImpulse = 0;
    solverConstraint.penetration = 0;
        
    {
      this.ftorqueAxis1.cross(rel_pos1, solverConstraint.contactNormal);
      solverConstraint.relpos1CrossNormal.set1(this.ftorqueAxis1);
      if (body0 != null) {
        solverConstraint.angularComponentA.set1(this.ftorqueAxis1);
        body0.getInvInertiaTensorWorld(this.tmpMat).transform1(solverConstraint.angularComponentA);
      } else {
        solverConstraint.angularComponentA.set3(0,0,0);
      }
    }
    {
      this.ftorqueAxis1.cross(rel_pos2, solverConstraint.contactNormal);
      solverConstraint.relpos2CrossNormal.set1(this.ftorqueAxis1);
      if (body1 != null) {
        solverConstraint.angularComponentB.set1(this.ftorqueAxis1);
        body1.getInvInertiaTensorWorld(this.tmpMat).transform1(solverConstraint.angularComponentB);
      } else {
        solverConstraint.angularComponentB.set3(0,0,0);
      }
    }
    
    var denom0 = 0;
    var denom1 = 0;
    if (body0 != null) {
      this.vec.cross(solverConstraint.angularComponentA, rel_pos1);
      denom0 = body0.inverseMass + normalAxis.dot(this.vec);
    }
    if (body1 != null) {
      this.vec.cross(solverConstraint.angularComponentB, rel_pos2);
      denom1 = body1.inverseMass + normalAxis.dot(this.vec);
    }
    
    var denom = relaxation / (denom0 + denom1);
    solverConstraint.jacDiagABInv = denom;
  }
  Bullet.ConstraintSolver.prototype.solveGroupCacheFriendlySetup=function(bodies,numBodies,manifoldPtr,manifold_offset,numManifolds,constraints,constraints_offset,numConstraints,infoGlobal) {
    try {
    if ((numConstraints + numManifolds) == 0) {
      return 0;
    }
    var manifold = null;
    var colObj0 = null, colObj1 = null;
    {
      {
        var i;
        this.rel_pos1.set3(0,0,0);//Vector3f rel_pos1 = Stack._alloc(Vector3f.class);
        this.rel_pos2.set3(0,0,0);//Vector3f rel_pos2 = Stack._alloc(Vector3f.class);
        this.pos1.set3(0,0,0);//Vector3f pos1 = Stack._alloc(Vector3f.class);
        this.pos2.set3(0,0,0);//Vector3f pos2 = Stack._alloc(Vector3f.class);
        this.vel.set3(0,0,0);//Vector3f vel = Stack._alloc(Vector3f.class);
        this.torqueAxis0.set3(0,0,0);// = Stack._alloc(Vector3f.class);
        this.torqueAxis1.set3(0,0,0);// = Stack._alloc(Vector3f.class);
        this.vel1.set3(0,0,0);//Vector3f vel1 = Stack._alloc(Vector3f.class);
        this.vel2.set3(0,0,0);//Vector3f vel2 = Stack._alloc(Vector3f.class);
        this.frictionDir1.set3(0,0,0);// = Stack._alloc(Vector3f.class);
        this.frictionDir2.set3(0,0,0);// = Stack._alloc(Vector3f.class);
        this.vec.set3(0,0,0);// = Stack._alloc(Vector3f.class);
        for (i = 0; i < numManifolds; i++) {
          manifold = manifoldPtr[manifold_offset+i];
          colObj0 = manifold.body0;
          colObj1 = manifold.body1;
        
          var solverBodyIdA = -1;
          var solverBodyIdB = -1;
        
          if (manifold.cachedPoints != 0) {
            if (colObj0.islandTag1 >= 0) {
              if (colObj0.companionId >= 0) {
                // body has already been converted
                solverBodyIdA = colObj0.companionId;
              } else {
                solverBodyIdA = this.tmpSolverBodyPool.length;
                var solverBody = this.bodiesPool.get();
                this.tmpSolverBodyPool.push(solverBody);
                this.initSolverBody(solverBody, colObj0);
                colObj0.companionId=solverBodyIdA;
              }
            } else {
              // create a static body
              solverBodyIdA = this.tmpSolverBodyPool.length;
              var solverBody = this.bodiesPool.get();//new SolverBody();//bodiesPool.get();
              this.tmpSolverBodyPool.push(solverBody);
              this.initSolverBody(solverBody, colObj0);
            }
            if (colObj1.islandTag1 >= 0) {
              if (colObj1.companionId >= 0) {
                solverBodyIdB = colObj1.companionId;
              } else {
                solverBodyIdB = this.tmpSolverBodyPool.length;
                var solverBody = this.bodiesPool.get();//new SolverBody();//bodiesPool.get();
                this.tmpSolverBodyPool.push(solverBody);
                this.initSolverBody(solverBody, colObj1);
                colObj1.companionId=solverBodyIdB;
              }
            } else {
              // create a static body
              solverBodyIdB = this.tmpSolverBodyPool.size();
              var solverBody = this.bodiesPool.get();//new SolverBody();//bodiesPool.get();
              this.tmpSolverBodyPool.add(solverBody);
              this.initSolverBody(solverBody, colObj1);
            }
          }
          var relaxation;
          for (var j = 0; j < manifold.cachedPoints; j++) {
            var cp = manifold.pointCache[j];
            if (cp.distance1 <= 0) {
              cp.getPositionWorldOnA(this.pos1);
              cp.getPositionWorldOnB(this.pos2);
        
              this.rel_pos1.sub2(this.pos1, colObj0.getWorldTransform(this.tmpTrans).origin);
              this.rel_pos2.sub2(this.pos2, colObj1.getWorldTransform(this.tmpTrans).origin);
        
              relaxation = 1;
              var rel_vel;
              var frictionIndex = this.tmpSolverConstraintPool.length;
              {
                var solverConstraint = this.constraintsPool.get();//new SolverConstraint();//soco0;//constraintsPool.get();
                this.tmpSolverConstraintPool.push(solverConstraint);
                var rb0 = Bullet.RigidBody.upcast(colObj0);
                var rb1 = Bullet.RigidBody.upcast(colObj1);
        
                solverConstraint.solverBodyIdA = solverBodyIdA;
                solverConstraint.solverBodyIdB = solverBodyIdB;
                solverConstraint.constraintType = Bullet.SolverConstraintType.SOLVER_CONTACT_1D;
        
                solverConstraint.originalContactPoint = cp;
                this.torqueAxis0.cross(this.rel_pos1, cp.normalWorldOnB);
      
                if (rb0 != null) {
                  solverConstraint.angularComponentA.set1(this.torqueAxis0);
                  rb0.getInvInertiaTensorWorld(this.tmpMat).transform1(solverConstraint.angularComponentA);
                } else {
                  solverConstraint.angularComponentA.set3(0,0,0);
                }
        
                this.torqueAxis1.cross(this.rel_pos2, cp.normalWorldOnB);
       
                if (rb1 != null) {
                  solverConstraint.angularComponentB.set1(this.torqueAxis1);
                  rb1.getInvInertiaTensorWorld(this.tmpMat).transform1(solverConstraint.angularComponentB);
                } else {
                  solverConstraint.angularComponentB.set3(0,0,0);
                }
    
                {
                  var denom0 = 0;
                  var denom1 = 0;
                  if (rb0 != null) {
                    this.vec.cross(solverConstraint.angularComponentA,this.rel_pos1);
                    denom0 = rb0.inverseMass + cp.normalWorldOnB.dot(this.vec);
                  }
                  if (rb1 != null) {
                    this.vec.cross(solverConstraint.angularComponentB,this.rel_pos2);
                    denom1 = rb1.inverseMass + cp.normalWorldOnB.dot(this.vec);
                  }
                  var denom = relaxation / (denom0 + denom1);
                  solverConstraint.jacDiagABInv = denom;
                }
                solverConstraint.contactNormal.set1(cp.normalWorldOnB);
                solverConstraint.relpos1CrossNormal.cross(this.rel_pos1, cp.normalWorldOnB);
                solverConstraint.relpos2CrossNormal.cross(this.rel_pos2, cp.normalWorldOnB);
        
                if (rb0 != null) {
                  rb0.getVelocityInLocalPoint(this.rel_pos1,this.vel1);
                } else {
                  this.vel1.set3(0,0,0);
                }
        
                if (rb1 != null) {
                  rb1.getVelocityInLocalPoint(this.rel_pos2,this.vel2);
                } else {
                  vel2.set3(0,0,0);
                }
       
                this.vel.sub2(this.vel1,this.vel2);
                rel_vel = cp.normalWorldOnB.dot(this.vel);
         
                solverConstraint.penetration = Math.min(cp.distance1 + infoGlobal.linearSlop, 0);
                solverConstraint.friction = cp.combinedFriction;
                solverConstraint.restitution = this.restitutionCurve(rel_vel, cp.combinedRestitution);
                if (solverConstraint.restitution <= 0) {
                  solverConstraint.restitution = 0;
                }
         
                var penVel = -solverConstraint.penetration / infoGlobal.timeStep;
        
                if (solverConstraint.restitution > penVel) {
                 solverConstraint.penetration = 0;
                }
        
                this.tmp.set3(0,0,0);//Vector3f tmp = Stack._alloc(Vector3f.class);
                // warm starting (or zero if disabled)
                if ((infoGlobal.solverMode & Bullet.SolverMode.SOLVER_USE_WARMSTARTING) != 0) {
                  solverConstraint.appliedImpulse = cp.appliedImpulse * infoGlobal.warmstartingFactor;
                  if (rb0 != null) {
                    this.tmp.scale2(rb0.inverseMass, solverConstraint.contactNormal);
                    this.tmpSolverBodyPool[solverConstraint.solverBodyIdA].internalApplyImpulse(this.tmp, solverConstraint.angularComponentA, solverConstraint.appliedImpulse);
                  }
                  if (rb1 != null) {
                    this.tmp.scale2(rb1.inverseMass, solverConstraint.contactNormal);
                    this.tmpSolverBodyPool[solverConstraint.solverBodyIdB].internalApplyImpulse(this.tmp, solverConstraint.angularComponentB, -solverConstraint.appliedImpulse);
                  }
                } else {
                  solverConstraint.appliedImpulse = 0;
                }
                solverConstraint.appliedPushImpulse = 0;
      
                solverConstraint.frictionIndex = this.tmpSolverFrictionConstraintPool.length;
                if (!cp.lateralFrictionInitialized) {
                  cp.lateralFrictionDir1.scale2(this.rel_vel, cp.normalWorldOnB);
                  cp.lateralFrictionDir1.sub2(this.vel, cp.lateralFrictionDir1);
        
                  var lat_rel_vel = cp.lateralFrictionDir1.lengthSquared();
                  if (lat_rel_vel > Bullet.BulletGlobals.FLT_EPSILON)  {
                    cp.lateralFrictionDir1.scale(1 / Math.sqrt(lat_rel_vel));
                    this.addFrictionConstraint(cp.lateralFrictionDir1, solverBodyIdA, solverBodyIdB, frictionIndex, cp, rel_pos1, rel_pos2, colObj0, colObj1, relaxation);
                    cp.lateralFrictionDir2.cross(cp.lateralFrictionDir1, cp.normalWorldOnB);
                    cp.lateralFrictionDir2.normalize(); //??
                    this.addFrictionConstraint(cp.lateralFrictionDir2, solverBodyIdA, solverBodyIdB, frictionIndex, cp, rel_pos1, rel_pos2, colObj0, colObj1, relaxation);
                  } else {
                    // re-calculate friction direction every frame, todo: check if this is really needed
                    Bullet.TransformUtil.planeSpace1(cp.normalWorldOnB, cp.lateralFrictionDir1, cp.lateralFrictionDir2);
                    this.addFrictionConstraint(cp.lateralFrictionDir1, solverBodyIdA, solverBodyIdB, frictionIndex, cp, this.rel_pos1, this.rel_pos2, colObj0, colObj1, relaxation);
                    this.addFrictionConstraint(cp.lateralFrictionDir2, solverBodyIdA, solverBodyIdB, frictionIndex, cp, this.rel_pos1, this.rel_pos2, colObj0, colObj1, relaxation);
                  }
                  cp.lateralFrictionInitialized = true;
                } else {
                  this.addFrictionConstraint(cp.lateralFrictionDir1, solverBodyIdA, solverBodyIdB, frictionIndex, cp, this.rel_pos1, this.rel_pos2, colObj0, colObj1, relaxation);
                  this.addFrictionConstraint(cp.lateralFrictionDir2, solverBodyIdA, solverBodyIdB, frictionIndex, cp, this.rel_pos1, this.rel_pos2, colObj0, colObj1, relaxation);
                }
                {
                  var frictionConstraint1 = this.tmpSolverFrictionConstraintPool[solverConstraint.frictionIndex];
                  if ((infoGlobal.solverMode & Bullet.SolverMode.SOLVER_USE_WARMSTARTING) != 0) {
                    frictionConstraint1.appliedImpulse = cp.appliedImpulseLateral1 * infoGlobal.warmstartingFactor;
                    if (rb0 != null) {
                      this.tmp.scale2(rb0.inverseMass, frictionConstraint1.contactNormal);
                      this.tmpSolverBodyPool[solverConstraint.solverBodyIdA].internalApplyImpulse(this.tmp, frictionConstraint1.angularComponentA, frictionConstraint1.appliedImpulse);
                    }
                    if (rb1 != null) {
                      this.tmp.scale2(rb1.inverseMass, frictionConstraint1.contactNormal);
                      this.tmpSolverBodyPool[solverConstraint.solverBodyIdB].internalApplyImpulse(this.tmp, frictionConstraint1.angularComponentB, -frictionConstraint1.appliedImpulse);
                    }
                  } else {
                    frictionConstraint1.appliedImpulse = 0;
                  }
                }
                {
                  var frictionConstraint2 = this.tmpSolverFrictionConstraintPool[solverConstraint.frictionIndex + 1];
                  if ((infoGlobal.solverMode & Bullet.SolverMode.SOLVER_USE_WARMSTARTING) != 0) {
                    frictionConstraint2.appliedImpulse = cp.appliedImpulseLateral2 * infoGlobal.warmstartingFactor;
                    if (rb0 != null) {
                      this.tmp.scale2(rb0.inverseMass, frictionConstraint2.contactNormal);
                      this.tmpSolverBodyPool[solverConstraint.solverBodyIdA].internalApplyImpulse(this.tmp, frictionConstraint2.angularComponentA, frictionConstraint2.appliedImpulse);
                    }
                    if (rb1 != null) {
                      this.tmp.scale2(rb1.inverseMass, frictionConstraint2.contactNormal);
                      this.tmpSolverBodyPool[solverConstraint.solverBodyIdB].internalApplyImpulse(this.tmp, frictionConstraint2.angularComponentB, -frictionConstraint2.appliedImpulse);
                    }
                  } else {
                    frictionConstraint2.appliedImpulse = 0;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // TODO: btContactSolverInfo info = infoGlobal;
    var numConstraintPool = this.tmpSolverConstraintPool.length;
    var numFrictionPool = this.tmpSolverFrictionConstraintPool.length;
        
    // todo: use stack allocator for such temporarily memory, same for solver bodies/constraints
    Bullet.MiscUtil.resizec(this.orderTmpConstraintPool,numConstraintPool,0);
    Bullet.MiscUtil.resizec(this.orderFrictionConstraintPool,numFrictionPool,0);
    {
      var i;
      for (i = 0; i < numConstraintPool; i++) {
        this.orderTmpConstraintPool.set(i, i);
      }
      for (i = 0; i < numFrictionPool; i++) {
        this.orderFrictionConstraintPool.set(i, i);
      }
    }
        
    return 0;
    } finally {}
  }
  Bullet.ConstraintSolver.prototype.solveGroupCacheFriendlyIterations=function(bodies,numBodies,manifoldPtr,manifold_offset,numManifolds,constraints,constraints_offset,numConstraints,infoGlobal) {
    try {
    var numConstraintPool = this.tmpSolverConstraintPool.length;
    var numFrictionPool = this.tmpSolverFrictionConstraintPool.length;
    
    // should traverse the contacts random order...
    var iteration;
    {
      for (iteration = 0; iteration < infoGlobal.numIterations; iteration++) {
        var j;
        if ((infoGlobal.solverMode & Bullet.SolverMode.SOLVER_RANDMIZE_ORDER) != 0) {
          if ((iteration & 7) == 0) {
            for (j = 0; j < numConstraintPool; ++j) {
              var tmp = this.orderTmpConstraintPool.get(j);
              var swapi = this.randInt2(j + 1);
              this.orderTmpConstraintPool.set(j,this.orderTmpConstraintPool.get(swapi));
              this.orderTmpConstraintPool.set(swapi, tmp);
            }
            for (j = 0; j < numFrictionPool; ++j) {
              var tmp = this.orderFrictionConstraintPool.get(j);
              var swapi = this.randInt2(j + 1);
              this.orderFrictionConstraintPool.set(j,this.orderFrictionConstraintPool.get(swapi));
              this.orderFrictionConstraintPool.set(swapi, tmp);
            }
          }
        }
        
        {
          var numPoolConstraints = this.tmpSolverConstraintPool.length;
          for (j = 0; j < numPoolConstraints; j++) {
            var solveManifold = this.tmpSolverConstraintPool[this.orderTmpConstraintPool.get(j)];
            
            this.resolveSingleCollisionCombinedCacheFriendly(this.tmpSolverBodyPool[solveManifold.solverBodyIdA],
             this.tmpSolverBodyPool[solveManifold.solverBodyIdB], solveManifold, infoGlobal);
          }
        }
        
        {
          var numFrictionPoolConstraints = this.tmpSolverFrictionConstraintPool.length;
          for (j = 0; j < numFrictionPoolConstraints; j++) {
            var solveManifold = this.tmpSolverFrictionConstraintPool[this.orderFrictionConstraintPool.get(j)];
        
            var totalImpulse = this.tmpSolverConstraintPool[solveManifold.frictionIndex].appliedImpulse +
              this.tmpSolverConstraintPool[solveManifold.frictionIndex].appliedPushImpulse;
            this.resolveSingleFrictionCacheFriendly(this.tmpSolverBodyPool[solveManifold.solverBodyIdA],
              this.tmpSolverBodyPool[solveManifold.solverBodyIdB],solveManifold,infoGlobal,totalImpulse);
          }
        }
      }
        
      if (infoGlobal.splitImpulse) {
        for (iteration = 0; iteration < infoGlobal.numIterations; iteration++) {
          {
            var numPoolConstraints = this.tmpSolverConstraintPool.size();
            var j;
            for (j = 0; j < numPoolConstraints; j++) {
              var solveManifold = this.tmpSolverConstraintPool.get(orderTmpConstraintPool.get(j));
              if (1==1) throw new Error("n/i");
            }
          }
        }
      }
    } 
    return 0;
    } finally {}
  }
  Bullet.ConstraintSolver.prototype.solveGroupCacheFriendly=function(bodies,numBodies,manifoldPtr,manifold_offset,numManifolds,constraints,constraints_offset,numConstraints,infoGlobal) {
    this.solveGroupCacheFriendlySetup(bodies, numBodies, manifoldPtr, manifold_offset, numManifolds, constraints, constraints_offset, numConstraints, infoGlobal);
    this.solveGroupCacheFriendlyIterations(bodies, numBodies, manifoldPtr, manifold_offset, numManifolds, constraints, constraints_offset, numConstraints, infoGlobal);
        
    var numPoolConstraints = this.tmpSolverConstraintPool.length;
    for (var j=0; j<numPoolConstraints; j++) {
      var solveManifold = this.tmpSolverConstraintPool[j];
      var pt = solveManifold.originalContactPoint;
      pt.appliedImpulse = solveManifold.appliedImpulse;
      pt.appliedImpulseLateral1 = this.tmpSolverFrictionConstraintPool[solveManifold.frictionIndex].appliedImpulse;
      pt.appliedImpulseLateral1 = this.tmpSolverFrictionConstraintPool[solveManifold.frictionIndex + 1].appliedImpulse;
      // do a callback here?
    }
    if (infoGlobal.splitImpulse) {
      for (var i=0; i<this.tmpSolverBodyPool.size(); i++) {
        if (1==1) throw new Error("n/i");
      }
    } else {
      for (var i=0; i<this.tmpSolverBodyPool.length; i++) {
        this.tmpSolverBodyPool[i].writebackVelocity();
        this.bodiesPool.release(this.tmpSolverBodyPool[i]);
      }
    }
    
    this.tmpSolverBodyPool.splice(0,this.tmpSolverBodyPool.length);//clear();
    
    for (var i=0; i<this.tmpSolverConstraintPool.length; i++) {
      this.constraintsPool.release(this.tmpSolverConstraintPool[i]);
    }
    this.tmpSolverConstraintPool.splice(0,this.tmpSolverConstraintPool.length);//clear();
        
    for (var i=0; i<this.tmpSolverFrictionConstraintPool.length; i++) {
      this.constraintsPool.release(this.tmpSolverFrictionConstraintPool[i]);
    }
    this.tmpSolverFrictionConstraintPool.splice(0,this.tmpSolverFrictionConstraintPool.length);//clear();    
    return 0;
  }
  Bullet.ConstraintSolver.prototype.solveGroup=function(bodies,numBodies,manifoldPtr,manifold_offset,numManifolds,constraints,constraints_offset,numConstraints,infoGlobal,dispatcher) {
    try {
    // TODO: solver cache friendly
    if ((infoGlobal.solverMode & Bullet.SolverMode.SOLVER_CACHE_FRIENDLY) != 0) {
      // you need to provide at least some bodies
      // SimpleDynamicsWorld needs to switch off SOLVER_CACHE_FRIENDLY
      var value = this.solveGroupCacheFriendly(bodies, numBodies, manifoldPtr, manifold_offset, numManifolds, constraints, constraints_offset, numConstraints, infoGlobal);
      return value;
    }
    throw new Error("€");
    } finally {}
  }
  Bullet.IslandCallback=function() {}
  Bullet.IslandCallback.prototype.numConstraints=0;
  Bullet.IslandCallback.prototype.init=function(solverInfo,solver,sortedConstraints,numConstraints,dispatcher) {
    this.solverInfo = solverInfo;
    this.solver = solver;
    this.sortedConstraints = sortedConstraints;
    this.numConstraints = numConstraints;
    this.dispatcher = dispatcher;
  }
  Bullet.IslandCallback.prototype.processIsland=function(bodies,numBodies,manifolds,manifolds_offset,numManifolds,islandId) {
    if (islandId < 0) {
      // we don't split islands, so all constraints/contact manifolds/bodies are passed into the solver regardless the island idsolver.solveGroup(bodies, numBodies, manifolds, manifolds_offset, numManifolds, sortedConstraints, 0, numConstraints, solverInfo, debugDrawer, dispatcher);
    } else {
      // also add all non-contact constraints/joints for this island
      var startConstraint_idx = -1;
      var numCurConstraints = 0;
      var i;
    
      // only call solveGroup if there is some work: avoid virtual function call, its overhead can be excessive
      if ((numManifolds + numCurConstraints) > 0) {
        this.solver.solveGroup(bodies,numBodies,manifolds,manifolds_offset,numManifolds,this.sortedConstraints,startConstraint_idx,numCurConstraints,this.solverInfo,this.dispatcher);
      }
    }
  }
  Bullet.CollisionWorld=function(dispatcher,pairCache,constraintSolver,collisionConfiguration) {
    this.collisionObjects = new Array();
    this.dispatchInfo = new Bullet.DispatcherInfo();
    this.trans=new Bullet.Transform(),
    this.tmpTrans=new Bullet.Transform();
    this.minAabb=new Vecmath.Vec3(),
    this.maxAabb=new Vecmath.Vec3(),
    this.tmp=new Vecmath.Vec3();
    this.solverInfo = new Bullet.ContactSolverInfo();
    this.constraints = new Array();
    this.gravity = new Vecmath.Vec3(0,-10,0);
    this.interpolatedTransform=new Bullet.Transform();
    this.tmpLinVel=new Vecmath.Vec3();
    this.tmpAngVel=new Vecmath.Vec3();
    this.sortedConstraints = new Array();
    this.solverCallback = new Bullet.IslandCallback();
    this.predictedTrans=new Bullet.Transform();
    
    this.dispatcher1 = dispatcher;
    this.broadphasePairCache = pairCache;
    this.constraintSolver = constraintSolver;
    
    if (this.constraintSolver == null) {
      this.constraintSolver = new Bullet.ConstraintSolver();
      this.ownsConstraintSolver = true;
    } else {
      this.ownsConstraintSolver = false;
    }
        
    {
      this.islandManager = new Bullet.SimulationIslandManager();
    }
        
    this.ownsIslandManager = true;
  }
  Bullet.CollisionWorld.prototype.addCollisionObject=function(collisionObject,collisionFilterGroup,collisionFilterMask) {
    this.collisionObjects.push(collisionObject);
       
    // calculate new AABB
    // TODO: check if it's overwritten or not
    this.trans = collisionObject.getWorldTransform(this.trans);//Stack._alloc(Transform.class));
        
    this.minAabb.set3(0,0,0);//Vector3f minAabb = Stack._alloc(Vector3f.class);
    this.maxAabb.set3(0,0,0);//Vector3f maxAabb = Stack._alloc(Vector3f.class);
    collisionObject.collisionShape.getAabb(this.trans,this.minAabb,this.maxAabb);
    
    var type = collisionObject.collisionShape.getShapeType();
    collisionObject.broadphaseHandle=this.broadphasePairCache.createProxy(
        this.minAabb,
        this.maxAabb,
        type,
        collisionObject,
        collisionFilterGroup,
        collisionFilterMask,
        this.dispatcher1, null);
  }
  Bullet.CollisionWorld.prototype.performDiscreteCollisionDetection=function() {
    try {
    this.updateAabbs();
    try {
    this.broadphasePairCache.calculateOverlappingPairs(this.dispatcher1);
    } finally {}
        
    var dispatcher = this.dispatcher1;
    {
    try {
    if (dispatcher != null) {
      dispatcher.dispatchAllCollisionPairs(this.broadphasePairCache.pairCache, this.dispatchInfo, this.dispatcher1);
    }
    } finally {}
    }
    } finally {}
  }
  Bullet.CollisionWorld.prototype.getPairCache=function() {
    return this.broadphasePairCache.pairCache;
  }
  Bullet.CollisionWorld.prototype.updateSingleAabb=function(colObj) {
    this.minAabb.set3(0,0,0);this.maxAabb.set3(0,0,0);//Vector3f minAabb = Stack._alloc(Vector3f.class), maxAabb = Stack._alloc(Vector3f.class);
    this.tmp.set3(0,0,0);//Vector3f tmp = Stack.a_lloc(Vector3f.class);
    colObj.collisionShape.getAabb(colObj.getWorldTransform(this.tmpTrans),this.minAabb,this.maxAabb);
    var bp =this.broadphasePairCache;
        
    // moving objects should be moderately sized, probably something wrong if not
    this.tmp.sub2(this.maxAabb,this.minAabb); // TODO: optimize
    if (colObj.isStaticObject() || (this.tmp.lengthSquared() < 1e12)) {
      bp.setAabb(colObj.broadphaseHandle,this.minAabb,this.maxAabb,this.dispatcher1);
    } else {
      // something went wrong, investigate
      // this assert is unwanted in 3D modelers (danger of loosing work)
      colObj.setActivationState(Bullet.CollisionObject.DISABLE_SIMULATION);
    }
  }
  Bullet.CollisionWorld.prototype.updateAabbs=function() {
    try {
    for (var i=0; i<this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
        
      // only update aabb of active objects
      if (colObj.isActive()) {
        this.updateSingleAabb(colObj);
      }
    }
    } finally {}
  }
  Bullet.CollisionWorld.prototype.getNumCollisionObjects=function() {
    return this.collisionObjects.length;
  }
  Bullet.CollisionWorld.prototype.stepSimulation1=function(timeStep) {
    return this.stepSimulation3(timeStep, 1, 1 / 60);
  }
  Bullet.CollisionWorld.prototype.localTime = 1/60;
  Bullet.CollisionWorld.prototype.ownsConstraintSolver=false;
  Bullet.CollisionWorld.prototype.profileTimings = 0;
  Bullet.CollisionWorld.prototype.saveKinematicState=function(timeStep) {
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null) {
        if (body.activationState1 != Bullet.CollisionObject.ISLAND_SLEEPING) {
          if (body.isKinematicObject()) {
          }
        }
      }
    }
  }
  Bullet.CollisionWorld.prototype.clearForces=function() {
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj=this.collisionObjects[i];
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null) {
        body.clearForces();
      }
    }
  }
  Bullet.CollisionWorld.prototype.applyGravity=function() {
    // todo: iterate over awake simulation islands!
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
       
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null && body.isActive()) {
        body.applyGravity();
      }
    }
  }
  Bullet.CollisionWorld.prototype.synchronizeMotionStates=function() {
    // todo: iterate over awake simulation islands!
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
       
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null && body.optionalMotionState != null && !body.isStaticOrKinematicObject()) {
        // we need to call the update at least once, even for sleeping objects
        // otherwise the 'graphics' transform never updates properly
        // so todo: add 'dirty' flag
        //if (body->getActivationState() != ISLAND_SLEEPING)
        {
          Bullet.TransformUtil.integrateTransform(
            body.getInterpolationWorldTransform(this.tmpTrans),
            body.getInterpolationLinearVelocity(this.tmpLinVel),
            body.getInterpolationAngularVelocity(this.tmpAngVel),
            this.localTime, this.interpolatedTransform);
          body.optionalMotionState.setWorldTransform(this.interpolatedTransform);
        }
      }
    }
  }
  Bullet.CollisionWorld.prototype.stepSimulation3=function(timeStep,maxSubSteps,fixedTimeStep) {
    var t0 = new Date().getTime();//System.nanoTime();
        
    try {
    var numSimulationSubSteps = 0;
        
    if (maxSubSteps != 0) {
      // fixed timestep with interpolation
      this.localTime += timeStep;
      if (this.localTime >= fixedTimeStep) {
        numSimulationSubSteps = Math.floor(this.localTime / fixedTimeStep);
        this.localTime -= numSimulationSubSteps * fixedTimeStep;
      }
    } else {
      //variable timestep
      fixedTimeStep = timeStep;
      localTime = timeStep;
      if (Bullet.ScalarUtil.fuzzyZero(timeStep)) {
        numSimulationSubSteps = 0;
        maxSubSteps = 0;
      } else {
        numSimulationSubSteps = 1;
        maxSubSteps = 1;
      }
    }
    
    if (numSimulationSubSteps != 0) {
      this.saveKinematicState(fixedTimeStep);
      //ullet.log("CollisionWorld.stepSimulation gravity="+this.collisionObjects[1].gravity+" timeStep="+timeStep+" totalforce="+this.collisionObjects[1].totalForce);
      this.applyGravity();
      //ullet.log("CollisionWorld.stepSimulation gravity="+this.collisionObjects[1].gravity+" timeStep="+timeStep+" totalforce="+this.collisionObjects[1].totalForce);
    
    
      // clamp the number of substeps, to prevent simulation grinding spiralling down to a halt
      var clampedSimulationSteps = (numSimulationSubSteps > maxSubSteps) ? maxSubSteps : numSimulationSubSteps;
       
      for (var i = 0; i < clampedSimulationSteps; i++) {
        this.internalSingleStepSimulation(fixedTimeStep);
        this.synchronizeMotionStates();
      }
    }
       
    this.synchronizeMotionStates();
    this.clearForces();
    
    return numSimulationSubSteps;
    } finally {}
  }
  Bullet.CollisionWorld.prototype.internalSingleStepSimulation=function(timeStep) {
    try {
    //ullet.log("CollisionWorld.internalSingleStepSimulation linvel="+this.collisionObjects[1].linearVelocity);
    // apply gravity, predict motion
    this.predictUnconstraintMotion(timeStep);
    //ullet.log("CollisionWorld.internalSingleStepSimulation linvel="+this.collisionObjects[1].linearVelocity+" timeStep="+timeStep);
    
    var dispatchInfo = this.dispatchInfo;
    //ullet.log("CollisionWorld.internalSingleStepSimulation linvel="+this.collisionObjects[1].linearVelocity);
       
    dispatchInfo.timeStep = timeStep;
    dispatchInfo.stepCount = 0;
       
    // perform collision detection
    this.performDiscreteCollisionDetection();
    //ullet.log("CollisionWorld.internalSingleStepSimulation linvel="+this.collisionObjects[1].linearVelocity);
    this.calculateSimulationIslands();   
    this.solverInfo.timeStep = timeStep;
    // solve contact and other joint constraints
    this.solveConstraints(this.solverInfo);
    //CallbackTriggers();
    // integrate transforms
    //ullet.log("CollisionWorld.internalSingleStepSimulation linvel="+this.collisionObjects[1].linearVelocity);
    this.integrateTransforms(timeStep);
    this.updateActivationState(timeStep);
    
    
    } finally {}
  }
  Bullet.CollisionWorld.prototype.setGravity=function(gravity) {
    this.gravity.set1(gravity);
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects.get(i);
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null) {
        body.setGravity(gravity);
      }
    }
  }
  Bullet.CollisionWorld.prototype.addRigidBody=function(body) {
    if (!body.isStaticOrKinematicObject()) {
      body.setGravity(this.gravity);
    }
        
    if (body.collisionShape != null) {
      var isDynamic = !(body.isStaticObject() || body.isKinematicObject());
      var collisionFilterGroup = isDynamic ? Bullet.CollisionFilterGroups.DEFAULT_FILTER : Bullet.CollisionFilterGroups.STATIC_FILTER;
      var collisionFilterMask = isDynamic ? Bullet.CollisionFilterGroups.ALL_FILTER : (Bullet.CollisionFilterGroups.ALL_FILTER ^ Bullet.CollisionFilterGroups.STATIC_FILTER);
        
      this.addCollisionObject(body, collisionFilterGroup, collisionFilterMask);
    }
  }
  Bullet.CollisionWorld.prototype.updateActivationState=function(timeStep) {
    try {
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null) {
        body.updateDeactivation(timeStep);
        
        if (body.wantsSleeping()) {
          if (body.isStaticOrKinematicObject()) {
            body.setActivationState(Bullet.CollisionObject.ISLAND_SLEEPING);
          } else {
            if (body.activationState1 == Bullet.CollisionObject.ACTIVE_TAG) {
              body.setActivationState(Bullet.CollisionObject.WANTS_DEACTIVATION);
            }
          }
        } else {
          if (body.activationState1 != Bullet.CollisionObject.DISABLE_DEACTIVATION) {
            body.setActivationState(Bullet.CollisionObject.ACTIVE_TAG);
          }
        }
      }
    }
    } finally {}
  }
  Bullet.CollisionWorld.prototype.solveConstraints=function(solverInfo) {
    try {
    // sorted version of all btTypedConstraint, based on islandId
    this.sortedConstraints.splice(0,this.sortedConstraints.length);//clear();
    for (var i=0; i<this.constraints.length; i++) {
      this.sortedConstraints.add(this.constraints[i]);
    }
    var constraintsPtr = this.getNumConstraints() != 0 ? sortedConstraints : null;
    this.solverCallback.init(solverInfo,this.constraintSolver,this.constraintsPtr,this.sortedConstraints.length,this.dispatcher1);
    this.constraintSolver.prepareSolve(this.getNumCollisionObjects(),this.dispatcher1.getNumManifolds());
       
    // solve all the constraints for this island
    this.islandManager.buildAndProcessIslands(this.dispatcher1,this.collisionObjects,this.solverCallback);
    this.constraintSolver.allSolved(solverInfo);
    } finally {}
  }
  Bullet.CollisionWorld.prototype.calculateSimulationIslands=function() {
    try {
    this.islandManager.updateActivationState(this,this.dispatcher1);
    
    // Store the island id in each body
    this.islandManager.storeIslandActivationState(this);
    } finally {}
  }
  Bullet.CollisionWorld.prototype.integrateTransforms=function(timeStep) {
    try {
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null) {
        if (body.isActive() && (!body.isStaticOrKinematicObject())) {
          //if (i==1) ullet.log("CollisionWorld.integrateTransform "+colObj.worldTransform+" "+this.predictedTrans+" "+colObj.linearVelocity);
          body.predictIntegratedTransform(timeStep, this.predictedTrans);
          //if (i==1) ullet.log("CollisionWorld.integrateTransform "+colObj.worldTransform+" "+this.predictedTrans);
          body.proceedToTransform(this.predictedTrans);
          //if (i==1) ullet.log("CollisionWorld.integrateTransform "+colObj.worldTransform);
        }
      }
    }
    } finally {}
  }
  Bullet.CollisionWorld.prototype.predictUnconstraintMotion=function(timeStep) {
    try {
    for (var i = 0; i < this.collisionObjects.length; i++) {
      var colObj = this.collisionObjects[i];
      var body = Bullet.RigidBody.upcast(colObj);
      if (body != null) {
        if (!body.isStaticOrKinematicObject()) {
          if (body.isActive()) {
            //if (i==1) ullet.log("CollisionWorld.predictUnconstraintMotion linvel="+colObj.linearVelocity);
            body.integrateVelocities(timeStep);
            // damping
            //if (i==1) ullet.log("CollisionWorld.predictUnconstraintMotion linvel="+colObj.linearVelocity);
            body.applyDamping(timeStep);
            //if (i==1) ullet.log("CollisionWorld.predictUnconstraintMotion linvel="+colObj.linearVelocity);
            body.predictIntegratedTransform(timeStep, body.getInterpolationWorldTransform(this.tmpTrans));
            //if (i==1) ullet.log("CollisionWorld.predictUnconstraintMotion linvel="+colObj.linearVelocity);
          }
        }
      }
    }
    } finally {}
  }
  Bullet.CollisionWorld.prototype.debugDrawSphere=function(radius,transform,color) {}
  Bullet.CollisionWorld.prototype.debugDrawObject=function(worldTransform,shape,color) {}
  Bullet.CollisionWorld.prototype.getNumConstraints=function() {
    return this.constraints.length;
  }
}
)(Bullet);