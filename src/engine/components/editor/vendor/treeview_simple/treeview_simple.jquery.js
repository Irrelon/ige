(function ($) {
	$.fn.treeview = function () {
		this.find('li').each( function() {
			if($(this).children('ul').length > 0 ) {
				$(this).addClass('parent');     
			}
		});
		
		this.find('li.parent > .expandLink').click( function( ) {
			$( this ).parent().toggleClass('active');
			$( this ).parent().children('ul').slideToggle(0);
		});
		
		this.find('li.parent > .expandLink').dblclick( function() {
			$('.tree li').each( function() {
				$(this).removeClass('active');
				$(this).addClass('active');
				$(this).children('ul').show();
			});
		});
		
		// Start expanded
		$('.tree li').each( function() {
			$(this).removeClass('active');
			$(this).addClass('active');
			$(this).children('ul').show();
		});
	};
}(jQuery));