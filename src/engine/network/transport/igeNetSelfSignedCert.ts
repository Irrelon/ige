import { createHash, generateKeyPairSync, randomBytes, sign, X509Certificate } from "node:crypto";

/** A certificate and key as PEM text, with the SHA-256 hash of the certificate (hex) a browser can pin. */
export interface IgeNetCertificate {
	cert: string;
	privKey: string;
	/** SHA-256 of the DER certificate, lower-case hex: what `serverCertificateHashes` takes. */
	hash: string;
	/** When it stops being valid. */
	expires: Date;
}

// ArrayLike: Node Buffers pass under every TypeScript (5.9 made Uint8Array generic over its buffer, and a Buffer's may be shared)
const der = (tag: number, ...parts: ArrayLike<number>[]): Uint8Array => {
	let length = 0;
	for (const part of parts) length += part.length;
	const header = length < 128 ? [tag, length] : length < 256 ? [tag, 0x81, length] : [tag, 0x82, length >> 8, length & 255];
	const out = new Uint8Array(header.length + length);
	out.set(header);
	let at = header.length;
	for (const part of parts) {
		out.set(part, at);
		at += part.length;
	}
	return out;
};
const oid = (...numbers: number[]): Uint8Array => {
	const bytes = [numbers[0] * 40 + numbers[1]];
	for (const n of numbers.slice(2)) {
		const chunk = [n & 127];
		for (let v = n >> 7; v > 0; v >>= 7) chunk.unshift((v & 127) | 128);
		bytes.push(...chunk);
	}
	return der(0x06, Uint8Array.from(bytes));
};
const utcTime = (date: Date): Uint8Array => {
	const p = (n: number) => String(n).padStart(2, "0");
	return der(0x17, Buffer.from(`${p(date.getUTCFullYear() % 100)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`));
};
const pem = (label: string, bytes: Uint8Array): string => `-----BEGIN ${label}-----\n${Buffer.from(bytes).toString("base64").replace(/(.{64})/g, "$1\n").replace(/\n$/, "")}\n-----END ${label}-----\n`;

/**
 * A short-lived self-signed certificate for a WebTransport server in development or on a LAN:
 * ECDSA P-256, valid for `days` (default 13: browsers refuse `serverCertificateHashes`
 * certificates valid for 14 days or more). Clients pin it by `hash`. Node only.
 */
export function igeNetSelfSignedCert (options: { name?: string; days?: number } = {}): IgeNetCertificate {
	const days = Math.min(options.days ?? 13, 13.9);
	const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
	const ecdsaSha256 = oid(1, 2, 840, 10045, 4, 3, 2);
	const name = der(0x30, der(0x31, der(0x30, oid(2, 5, 4, 3), der(0x0c, Buffer.from(options.name ?? "ige-webtransport")))));
	const notBefore = new Date(Date.now() - 60_000);
	const notAfter = new Date(Date.now() + days * 86_400_000);
	const serial = randomBytes(8);
	serial[0] &= 0x7f;
	if (serial[0] === 0) serial[0] = 1;
	const tbs = der(0x30,
		der(0xa0, der(0x02, Uint8Array.from([2]))),
		der(0x02, serial),
		der(0x30, ecdsaSha256),
		name,
		der(0x30, utcTime(notBefore), utcTime(notAfter)),
		name,
		publicKey.export({ type: "spki", format: "der" }),
		// Extensions: not a CA, usable as a TLS server; names the clients may use (the hash is what's checked)
		der(0xa3, der(0x30,
			der(0x30, oid(2, 5, 29, 19), der(0x01, Uint8Array.from([0xff])), der(0x04, der(0x30))),
			der(0x30, oid(2, 5, 29, 37), der(0x04, der(0x30, oid(1, 3, 6, 1, 5, 5, 7, 3, 1)))),
			der(0x30, oid(2, 5, 29, 17), der(0x04, der(0x30, der(0x82, Buffer.from("localhost")), der(0x87, Uint8Array.from([127, 0, 0, 1])))))
		))
	);
	const signature = sign("sha256", tbs, privateKey as never);
	const cert = der(0x30, tbs, der(0x30, ecdsaSha256), der(0x03, Uint8Array.from([0, ...signature])));
	return {
		cert: pem("CERTIFICATE", cert),
		privKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
		hash: createHash("sha256").update(cert).digest("hex"),
		expires: notAfter
	};
}

/** The SHA-256 hash (hex) of a PEM certificate. */
export function igeNetCertHash (certPem: string): string {
	return createHash("sha256").update(new Uint8Array(new X509Certificate(certPem).raw)).digest("hex");
}
