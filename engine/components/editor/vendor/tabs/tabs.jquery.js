(function ($) {
	$.fn.tabs = function (options) {
		this.find('.tab').click(function () {
			var elem = $(this),
				contentId;
			
			// Get tab content id
			contentId = elem.attr('data-content');
			
			// Make all tabs non-active
			$('.tab.active').removeClass('active');
			$('.tabContent').removeClass('active');
			
			// Make this tab and content active
			elem.addClass('active');
			$('#' + contentId).addClass('active');
		});
		
		return this;
	};
}(jQuery));