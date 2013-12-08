(function ($) {
	$.fn.autoback = function () {
		this.each(function(index, elem) {
			elem = $(elem);
			
			$('<div class="backLayer"></div>')
				.css('left', elem.css('left'))
				.css('top', elem.css('top'))
				.css('bottom', elem.css('bottom'))
				.css('right', elem.css('right'))
				.css('width', elem.css('width'))
				.attr('data-for', elem.attr('id'))
				.insertBefore(elem);
		});
	};
}(jQuery));