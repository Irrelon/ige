(function ($) {
	$.fn.tabs = function (options) {
		this.on('click', '.tab', function (event) {
			var elem = $(event.currentTarget),
				contentId;
			
			if (elem.hasClass('active')) {
				// Make all tabs non-active
				$('.tab.active').removeClass('active');
				$('.tabContent').removeClass('active');
				$('.backLayer[data-for="rightBar"]').hide();
				
				// Hide the right panel
				$('#tabContents').hide();
			} else {
				// Get tab content id
				contentId = elem.attr('data-content');
				
				// Make all tabs non-active
				$('.tab.active').removeClass('active');
				$('.tabContent').removeClass('active');
				
				// Make this tab and content active
				elem.addClass('active');
				$('#' + contentId).addClass('active');
				
				$('#tabContents').show();
				$('.backLayer[data-for="rightBar"]')
					.show()
					.css('width', $('#rightBar').width());
			}
		});
		
		return this;
	};
}(jQuery));