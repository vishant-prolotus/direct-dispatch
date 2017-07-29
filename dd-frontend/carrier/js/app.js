
/* Viewport plugin */
(function($){$.belowthefold=function(element,settings){var fold=$(window).height()+$(window).scrollTop();return fold<=$(element).offset().top-settings.threshold;};$.abovethetop=function(element,settings){var top=$(window).scrollTop();return top>=$(element).offset().top+$(element).height()-settings.threshold;};$.rightofscreen=function(element,settings){var fold=$(window).width()+$(window).scrollLeft();return fold<=$(element).offset().left-settings.threshold;};$.leftofscreen=function(element,settings){var left=$(window).scrollLeft();return left>=$(element).offset().left+$(element).width()-settings.threshold;};$.inviewport=function(element,settings){return!$.rightofscreen(element,settings)&&!$.leftofscreen(element,settings)&&!$.belowthefold(element,settings)&&!$.abovethetop(element,settings);};$.extend($.expr[':'],{"below-the-fold":function(a,i,m){return $.belowthefold(a,{threshold:0});},"above-the-top":function(a,i,m){return $.abovethetop(a,{threshold:0});},"left-of-screen":function(a,i,m){return $.leftofscreen(a,{threshold:0});},"right-of-screen":function(a,i,m){return $.rightofscreen(a,{threshold:0});},"in-viewport":function(a,i,m){return $.inviewport(a,{threshold:0});}});})(jQuery);



$(document).ready(function(){

	// smooth scrolling

	$('a.smooth-scroll').click(function() {
    $('html, body').animate({
        scrollTop: $( $.attr(this, 'href') ).offset().top
    }, 1000);
    return false;
	});

	/*================ Stretch Armstrong ================*/

	var backgrounds = $('div.backgrounds');
	backgrounds.stretcharmstrong({
		'rotate'     : true,
		'rotate_interval'   : 5000,
		'transition' : {
		    'type'        : 'fade',
		    'duration'    : 1500,
		    'orientation' : 'horizontal'
		},
		'element'    : 'img',
		'resize'     : true,
		'background' : true
	});

	/*================ Header scrolling ================*/

	$(window).bind('scroll', function(){
		if($(window).width() < 768){ return; }
		$('.slider.large').css({ 'margin-top' : $(document).scrollTop() * 0.9 });
		$('.slider.small').css({ 'margin-top' : $(document).scrollTop() * 0.6 });
	});

	/*================ Accordian ================*/

	$('.acc-content').live('click', function(e){
		e.preventDefault();
		if ($(this).hasClass('is-active')) { return; };
		$('.acc-content.is-active').removeClass('is-active');
		$(this).addClass('is-active');
	});

	/*================ Header Slider Animations ================*/

	var slideCount = $('.small .slides').find('img').length;
	var imgIndex = 1;

	var slideWidthSml = 216;
	var slideWidthLrg = 498;

	/* Set the width of the slides container */
	var sliderWidthSml = slideWidthSml * slideCount + 10;
	$('.slider.small .slides').width(sliderWidthSml);

	var sliderWidthLrg = slideWidthLrg * slideCount + 12;
	$('.slider.large .slides').width(sliderWidthLrg);

	/* Function for switching out the image */
	function switchImages() {
		if($('.slider').is(':animated')){ return; }
		if (imgIndex == slideCount) {
			$('.small .slides').animate({ "left": '+='+slideWidthSml*2 });
			$('.large .slides').animate({ "left": '+='+slideWidthLrg*2 });
			imgIndex = 1;
			return;
		}
		$('.small .slides').animate({ "left": '-='+slideWidthSml });
		$('.large .slides').animate({ "left": '-='+slideWidthLrg });
		imgIndex++;
	}

	/* Slide app images */
	setInterval(switchImages, 3000);

	/* Show video in dialog */

	$(".video-link").colorbox({ inline: true });

	// showing testimonials
	(function () {
		var current = 0;
		var last = $('#testimonials blockquote').length - 1;
		var switchTestimonial = function () {
			$('#testimonials blockquote').eq(current).fadeOut('slow', function () {
				current = (current == last) ? 0 : current+1;
				$('#testimonials blockquote').eq(current).fadeIn('slow');
			});
		};
		$('#testimonials blockquote:gt(0)').hide();
		setInterval(switchTestimonial, 10000);
	})();


	/*================ Lazy Loading of elements ================*/

	$(window).bind('scroll', function(){ $('.fadein:in-viewport').css({ 'opacity': 1, top : 0 }); });
	$('.fadein:in-viewport').css({ 'opacity': 1, top : 0 });


	/*================ Skills sliders ================*/

	$('.skills li').each(function(){
		$(this).before('<div class="skill-title">'+$(this).html()+'</div>');
		$('<span class="percent-bar" />').appendTo($(this));
		$(this).find('.percent-bar').html($(this).data('skills-percent')+'%');
	});

	function showSkills(){
		$('.skills li:in-viewport').each(function(){
			if (!$(this).find('.percent-bar').hasClass('animatedIn')) {
				$(this).find('.percent-bar').animate({ 'width' : $(this).data('skills-percent')+'%' }, 2500).addClass('animatedIn');
			}
		});
	}
	showSkills();

	/* Animate the bars in when they come into view. */
	$(window).bind('scroll', function() { showSkills(); });

});

// Google Anatyics
(function(b,o,i,l,e,r){b.GoogleAnalyticsObject=l;b[l]||(b[l]=
  function(){(b[l].q=b[l].q||[]).push(arguments)});b[l].l=+new Date;
e=o.createElement(i);r=o.getElementsByTagName(i)[0];
e.src='//www.google-analytics.com/analytics.js';
r.parentNode.insertBefore(e,r)}(window,document,'script','ga'));
ga('create','UA-52029517-3');ga('send','pageview');