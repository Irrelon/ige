var IgeCuboid = IgeEntity.extend({
	classId: 'IgeCuboid',

	tick: function (ctx) {
		this._transformContext(ctx);

		var r3d = this._geometry,
			xl1 = new IgePoint(-(r3d.x / 2), 0, 0)
				.toIso(),
			xl2 = new IgePoint(+(r3d.x / 2), 0, 0)
				.toIso(),
			xl3 = new IgePoint(0, -(r3d.y / 2), 0)
				.toIso(),
			xl4 = new IgePoint(0, +(r3d.y / 2), 0)
				.toIso(),
			xl5 = new IgePoint(0, 0, -(r3d.z / 2))
				.toIso(),
			xl6 = new IgePoint(0, 0, +(r3d.z / 2))
				.toIso(),
			// Bottom face
			bf1 = new IgePoint(-(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2))
				.toIso(),
			bf2 = new IgePoint(+(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2))
				.toIso(),
			bf3 = new IgePoint(+(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2))
				.toIso(),
			bf4 = new IgePoint(-(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2))
				.toIso(),
			// Top face
			tf1 = new IgePoint(-(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2))
				.toIso(),
			tf2 = new IgePoint(+(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2))
				.toIso(),
			tf3 = new IgePoint(+(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2))
				.toIso(),
			tf4 = new IgePoint(-(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2))
				.toIso();

		ctx.strokeStyle = '#a200ff';

		// Axis lines
		ctx.beginPath();
		ctx.moveTo(xl1.x, xl1.y);
		ctx.lineTo(xl2.x, xl2.y);
		ctx.moveTo(xl3.x, xl3.y);
		ctx.lineTo(xl4.x, xl4.y);
		ctx.moveTo(xl5.x, xl5.y);
		ctx.lineTo(xl6.x, xl6.y);
		ctx.stroke();

		// Left face
		ctx.fillStyle = '#545454';
		ctx.beginPath();
		ctx.moveTo(bf3.x, bf3.y);
		ctx.lineTo(bf4.x, bf4.y);
		ctx.lineTo(tf4.x, tf4.y);
		ctx.lineTo(tf3.x, tf3.y);
		ctx.lineTo(bf3.x, bf3.y);
		ctx.fill();
		ctx.stroke();

		// Right face
		ctx.fillStyle = '#282828';
		ctx.beginPath();
		ctx.moveTo(bf3.x, bf3.y);
		ctx.lineTo(bf2.x, bf2.y);
		ctx.lineTo(tf2.x, tf2.y);
		ctx.lineTo(tf3.x, tf3.y);
		ctx.lineTo(bf3.x, bf3.y);
		ctx.fill();
		ctx.stroke();

		// Top face
		ctx.fillStyle = '#676767';
		ctx.beginPath();
		ctx.moveTo(tf1.x, tf1.y);
		ctx.lineTo(tf2.x, tf2.y);
		ctx.lineTo(tf3.x, tf3.y);
		ctx.lineTo(tf4.x, tf4.y);
		ctx.lineTo(tf1.x, tf1.y);
		ctx.fill();
		ctx.stroke();

		//ctx.fillStyle = '#ffffff';
		//ctx.fillText(this.id(), 0, 0);

		IgeEntity.prototype.tick.call(this, ctx, true);

		if (this._drawBounds) {
			var ga = ctx.globalAlpha;
			ctx.globalAlpha = 0.3;

			// Left face
			ctx.fillStyle = '#545454';
			ctx.beginPath();
			ctx.moveTo(bf3.x, bf3.y);
			ctx.lineTo(bf4.x, bf4.y);
			ctx.lineTo(tf4.x, tf4.y);
			ctx.lineTo(tf3.x, tf3.y);
			ctx.lineTo(bf3.x, bf3.y);
			ctx.fill();
			ctx.stroke();

			// Right face
			ctx.fillStyle = '#282828';
			ctx.beginPath();
			ctx.moveTo(bf3.x, bf3.y);
			ctx.lineTo(bf2.x, bf2.y);
			ctx.lineTo(tf2.x, tf2.y);
			ctx.lineTo(tf3.x, tf3.y);
			ctx.lineTo(bf3.x, bf3.y);
			ctx.fill();
			ctx.stroke();

			// Top face
			ctx.fillStyle = '#676767';
			ctx.beginPath();
			ctx.moveTo(tf1.x, tf1.y);
			ctx.lineTo(tf2.x, tf2.y);
			ctx.lineTo(tf3.x, tf3.y);
			ctx.lineTo(tf4.x, tf4.y);
			ctx.lineTo(tf1.x, tf1.y);
			ctx.fill();
			ctx.stroke();
			ctx.globalAlpha = ga;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeCuboid; }