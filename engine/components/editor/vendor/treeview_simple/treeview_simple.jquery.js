(function ($) {
	$.fn.treeview = function () {
		this.find('li').each( function() {
			if($(this).children('ul').length > 0 ) {
				$(this).addClass('parent');     
			}
		});
		
		this.find('li.parent > a').click( function( ) {
			$( this ).parent().toggleClass( 'active' );
			$( this ).parent().children('ul').slideToggle('fast');
		});
		
		/*$( '#all' ).click( function() {
			$( '.tree li' ).each( function() {
				$( this ).toggleClass( 'active' );
				$( this ).children( 'ul' ).slideToggle( 'fast' );
			});
		});*/
	};
}(jQuery));