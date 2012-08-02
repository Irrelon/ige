/*
* Kendo UI Web v2012.2.710 (http://kendoui.com)
* Copyright 2012 Telerik AD. All rights reserved.
*
* Kendo UI Web commercial licenses may be obtained at http://kendoui.com/web-license
* If you do not own a commercial license, this file shall be governed by the
* GNU General Public License (GPL) version 3.
* For GPL requirements, please review: http://www.gnu.org/copyleft/gpl.html
*/
;(function(a,b){var c=window.kendo,d=a.proxy,e="data-dir",f="asc",g="single",h="data-field",i="desc",j=".k-link",k=c.ui.Widget,l=k.extend({init:function(a,b){var c=this,e;k.fn.init.call(c,a,b),c.dataSource=c.options.dataSource.bind("change",d(c.refresh,c)),e=c.element.find(j),e[0]||(e=c.element.wrapInner('<a class="k-link" href="#"/>').find(j)),c.link=e,c.element.click(d(c._click,c))},options:{name:"Sortable",mode:g,allowUnsort:!0},refresh:function(){var b=this,c=b.dataSource.sort()||[],d,g,j,k,l=b.element,m=l.attr(h);l.removeAttr(e);for(d=0,g=c.length;d<g;d++)j=c[d],m==j.field&&l.attr(e,j.dir);k=l.attr(e),l.find(".k-i-arrow-n,.k-i-arrow-s").remove(),k===f?a('<span class="k-icon k-i-arrow-n" />').appendTo(b.link):k===i&&a('<span class="k-icon k-i-arrow-s" />').appendTo(b.link)},_click:function(a){var c=this,d=c.element,j=d.attr(h),k=d.attr(e),l=c.options,m=c.dataSource.sort()||[],n,o;k===f?k=i:k===i&&l.allowUnsort?k=b:k=f;if(l.mode===g)m=[{field:j,dir:k}];else if(l.mode==="multiple"){for(n=0,o=m.length;n<o;n++)if(m[n].field===j){m.splice(n,1);break}m.push({field:j,dir:k})}a.preventDefault(),c.dataSource.sort(m)}});c.ui.plugin(l)})(jQuery);