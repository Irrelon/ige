/**
 * The engine UI's default styles: what a browser's own stylesheet gives the
 * elements game UIs use (block and inline elements, tables, form controls,
 * headings), close to Chrome's so markup looks the same as on the page.
 */
export const UA_STYLESHEET = `
html, body, div, section, article, aside, header, footer, nav, main, p, h1, h2, h3, h4, h5, h6, ul, ol, li, form, fieldset, figure, figcaption, details, summary, dl, dt, dd, blockquote, pre, hr, address, legend { display: block; }
html { font-size: 16px; color: #000; line-height: normal; }
li { display: list-item; }
head, script, style, template, head > title, meta, link, [hidden], datalist, option { display: none; }
body { margin: 8px; }
p { margin-top: 1em; margin-bottom: 1em; }
h1 { font-size: 2em; margin-top: 0.67em; margin-bottom: 0.67em; font-weight: 700; }
h2 { font-size: 1.5em; margin-top: 0.83em; margin-bottom: 0.83em; font-weight: 700; }
h3 { font-size: 1.17em; margin-top: 1em; margin-bottom: 1em; font-weight: 700; }
h4 { margin-top: 1.33em; margin-bottom: 1.33em; font-weight: 700; }
h5 { font-size: 0.83em; margin-top: 1.67em; margin-bottom: 1.67em; font-weight: 700; }
h6 { font-size: 0.67em; margin-top: 2.33em; margin-bottom: 2.33em; font-weight: 700; }
ul, ol { margin-top: 1em; margin-bottom: 1em; padding-left: 40px; }
b, strong { font-weight: bolder; }
i, em, cite, var, dfn { font-style: italic; }
small { font-size: smaller; }
sub, sup { font-size: smaller; }
code, kbd, samp, pre { font-family: monospace; }
pre { white-space: pre; margin-top: 1em; margin-bottom: 1em; }
hr { border-top: 1px inset #ccc; margin-top: 0.5em; margin-bottom: 0.5em; }
table { display: table; border-collapse: separate; border-spacing: 2px; box-sizing: border-box; }
thead { display: table-header-group; vertical-align: middle; }
tbody { display: table-row-group; vertical-align: middle; }
tfoot { display: table-footer-group; vertical-align: middle; }
tr { display: table-row; vertical-align: inherit; }
td, th { display: table-cell; vertical-align: inherit; padding: 1px; }
th { font-weight: 700; text-align: -internal-center; }
caption { display: table-caption; text-align: center; }
col { display: table-column; }
colgroup { display: table-column-group; }
button, input, select, textarea { display: inline-block; font-family: Arial, sans-serif; font-size: 13.333px; font-weight: 400; font-style: normal; line-height: normal; letter-spacing: normal; word-spacing: normal; text-transform: none; text-indent: 0; text-shadow: none; color: #000; text-align: start; box-sizing: border-box; }
button { text-align: center; }
button { padding: 1px 6px; border: 2px outset #000; background-color: #efefef; cursor: default; }
input, textarea { padding: 1px 2px; border: 2px inset #767676; background-color: #fff; text-align: start; cursor: text; }
input[type=range] { border: none; padding: 0; margin: 2px; width: 129px; height: 16px; color: #101010; cursor: default; }
input[type=range]:disabled { background-color: transparent; }
input[type=checkbox], input[type=radio] { border: none; background-color: transparent; padding: 0; width: 13px; height: 13px; margin: 3px 3px 3px 4px; }
select { padding: 1px 2px; border: 1px solid #767676; background-color: #fff; }
textarea { white-space: pre-wrap; }
img, canvas, svg, video { display: inline-block; }
svg { overflow: hidden; }
text, tspan, textPath { white-space: nowrap; }
a { cursor: pointer; }
::placeholder { color: #757575; }
button:disabled { color: rgba(16, 16, 16, 0.3); background-color: rgba(239, 239, 239, 0.3); border-color: rgba(118, 118, 118, 0.3); }
`;
