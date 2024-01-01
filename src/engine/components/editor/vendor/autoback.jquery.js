(function ($) {
	$.fn.autoback = function () {
		this.each(function(index, elem) {
			elem = $(elem);
			
			$('<div class="backLayer editorElem toggleHide"></div>')
				.css('left', elem.css('left'))
				.css('top', elem.css('top'))
				.css('bottom', elem.css('bottom'))
				.css('right', elem.css('right'))
				.css('width', elem.css('width'))
				.css('height', elem.css('height'))
				.attr('data-for', elem.attr('id'))
				.insertBefore(elem);
		});
	};
}(jQuery));