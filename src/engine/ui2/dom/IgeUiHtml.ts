/**
 * An HTML parser for the engine's UI: the markup game code writes in template
 * strings (innerHTML) into elements and text. Tags, attributes (quoted,
 * unquoted, bare), character references, void elements, implied closes of
 * <p>, <li>, <td>, <th>, <tr> and <option>, comments; <svg> and its shapes
 * are kept as elements. Whatever it can't make sense of becomes text.
 */

export interface IgeHtmlElementNode {
	type: "element";
	tag: string;
	attrs: [string, string][];
	children: IgeHtmlNode[];
}

export interface IgeHtmlTextNode {
	type: "text";
	text: string;
}

export type IgeHtmlNode = IgeHtmlElementNode | IgeHtmlTextNode;

export const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

const ENTITIES: Record<string, string> = {
	amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", middot: "·", times: "×", minus: "−", hellip: "…", mdash: "—", ndash: "–",
	larr: "←", rarr: "→", uarr: "↑", darr: "↓", deg: "°", copy: "©", reg: "®", trade: "™", bull: "•", laquo: "«", raquo: "»",
	frac12: "½", plusmn: "±", pound: "£", euro: "€", check: "✓", thinsp: " ", ensp: " ", emsp: " ", hearts: "♥", spades: "♠", clubs: "♣", diams: "♦"
};

/** Character references (&amp; &#39; &#x2192;) replaced. */
export function decodeEntities (text: string): string {
	if (!text.includes("&")) return text;
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, ref: string) => {
		if (ref[0] === "#") {
			const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : m;
		}
		return ENTITIES[ref.toLowerCase()] ?? m;
	});
}

export function escapeText (text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
}

export function escapeAttr (text: string): string {
	return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Closing one of these is implied by opening another of the listed tags. */
const IMPLIED: Record<string, Set<string>> = {
	p: new Set(["p", "div", "ul", "ol", "table", "h1", "h2", "h3", "h4", "h5", "h6", "section", "header", "footer"]),
	li: new Set(["li"]),
	option: new Set(["option"]),
	td: new Set(["td", "th", "tr"]),
	th: new Set(["td", "th", "tr"]),
	tr: new Set(["tr"])
};

/** Parses a fragment. */
export function parseHtml (html: string): IgeHtmlNode[] {
	const root: IgeHtmlElementNode = { type: "element", tag: "#root", attrs: [], children: [] };
	const stack: IgeHtmlElementNode[] = [root];
	const top = () => stack[stack.length - 1];
	let i = 0;
	const text = (t: string) => {
		if (!t) return;
		const kids = top().children;
		const last = kids[kids.length - 1];
		const decoded = decodeEntities(t);
		if (last && last.type === "text") last.text += decoded;
		else kids.push({ type: "text", text: decoded });
	};
	while (i < html.length) {
		const lt = html.indexOf("<", i);
		if (lt < 0) {
			text(html.slice(i));
			break;
		}
		text(html.slice(i, lt));
		i = lt;
		if (html.startsWith("<!--", i)) {
			const end = html.indexOf("-->", i + 4);
			i = end < 0 ? html.length : end + 3;
			continue;
		}
		if (html[i + 1] === "/") {
			const end = html.indexOf(">", i);
			const tag = html.slice(i + 2, end < 0 ? html.length : end).trim().toLowerCase();
			i = end < 0 ? html.length : end + 1;
			// Close up to the matching open element (unmatched closes are dropped)
			for (let k = stack.length - 1; k > 0; k--) {
				if (stack[k].tag === tag) {
					stack.length = k;
					break;
				}
			}
			continue;
		}
		const m = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(i, i + 64));
		if (!m) {
			text("<");
			i++;
			continue;
		}
		const tag = m[1].toLowerCase();
		i += m[0].length;
		// Attributes, to the tag's end
		const attrs: [string, string][] = [];
		let selfClose = false;
		while (i < html.length) {
			while (i < html.length && /\s/.test(html[i])) i++;
			if (html[i] === ">") {
				i++;
				break;
			}
			if (html[i] === "/" && html[i + 1] === ">") {
				selfClose = true;
				i += 2;
				break;
			}
			const name = /^[^\s=>/"']+/.exec(html.slice(i, i + 256));
			if (!name) {
				i++;
				continue;
			}
			i += name[0].length;
			while (i < html.length && /\s/.test(html[i])) i++;
			let value = "";
			if (html[i] === "=") {
				i++;
				while (i < html.length && /\s/.test(html[i])) i++;
				const q = html[i];
				if (q === "\"" || q === "'") {
					const end = html.indexOf(q, i + 1);
					value = html.slice(i + 1, end < 0 ? html.length : end);
					i = end < 0 ? html.length : end + 1;
				} else {
					const un = /^[^\s>]+/.exec(html.slice(i, i + 1024));
					value = un ? un[0] : "";
					i += value.length;
				}
			}
			attrs.push([name[0].toLowerCase(), decodeEntities(value)]);
		}
		// An open element this one implicitly closes
		const parent = top();
		if (parent !== root && IMPLIED[parent.tag]?.has(tag)) stack.pop();
		if (tag === "tr" && top().tag === "tr") stack.pop();
		const el: IgeHtmlElementNode = { type: "element", tag, attrs, children: [] };
		top().children.push(el);
		if (!selfClose && !VOID_TAGS.has(tag)) {
			stack.push(el);
			// Raw text elements
			if (tag === "style" || tag === "script" || tag === "textarea") {
				const end = html.toLowerCase().indexOf(`</${tag}`, i);
				const raw = html.slice(i, end < 0 ? html.length : end);
				if (raw) el.children.push({ type: "text", text: tag === "textarea" ? decodeEntities(raw) : raw });
				i = end < 0 ? html.length : html.indexOf(">", end) + 1;
				stack.pop();
			}
		}
	}
	return root.children;
}
