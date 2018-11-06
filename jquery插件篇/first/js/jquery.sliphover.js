;
(function($, window, document, undefined) {
	var defaults = {
		target: 'img',
		caption: 'title',
		duration: 'fast',
		fontColor: '#fff',
		textAlgin: 'center',
		backgroundColor: 'rgba(0,0,0,.7)',
		reverse: false,
		height: '100%',
		verticalMiddle: true
	};
	var pluginName = 'sliphover';
	function SlipHover(element, options) {
		this.element = element,
		this.settings = $.extend({}, defaults, options);
		this._defaults = defaults;
		this.init();
	}
	SlipHover.prototype.init = function() {
		//disabled on touch device
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        	return;
        }

		var target = this.settings.target, that = this;
		$(this.element).off('mouseenter.sliphover', target).on('mouseenter.sliphover', target, function(event) {
			var $element = $(this),
            $overlayContainer = that.createContainer($element);
            $overlayContainer.off('mouseenter.sliphover mouseleave.sliphover').on('mouseenter.sliphover mouseleave.sliphover', function(event) {
            	var direction = that.getDirection($(this), event);
            	if(event.type === 'mouseenter') {
            		var $overlay = $overlayContainer.find('.sliphover-overlay');
            		if(!$overlay.length) {
            			$overlay = that.createOverlay(that, direction, $element);
            			$(this).html($overlay);
            		}
            		
            		that.slideIn(that, $overlay);
            		console.log('划入')
            	}else {
            		that.removeOverlay(that, $(this), direction);
            		console.log('划出')
            	}
            	
            })
		})

		console.log('初始化');
	}
	SlipHover.prototype.createContainer = function($element) {
		var top = $element.offset().top, 
			left = $element.offset().left,
			width = $element.outerWidth(),
			height = $element.outerHeight(),
			zIndex = $element.css("z-index");
		var $overlayContainer = $('<div class="sliphover-container"></div>').css({
				pointerEvent: 'none',
                width: width,
                height: height,
                position: 'absolute',
                overflow: 'hidden',
                top: top,
                left: left,
                borderRadius: $element.css('border-radius'), //in case the target has a round border, this will make the overlay more nicer
                zIndex: zIndex == +zIndex ? (zIndex + 1) : 999
		})
		$('body').append($overlayContainer);
		return $overlayContainer;
	}
	SlipHover.prototype.getDirection = function($target, event) {
		var w = $target.width(),
			h = $target.height(),
			x = (event.pageX - $target.offset().left - (w / 2)) * (w > h ? (h /w ) : 1),
			y = (event.pageY - $target.offset().top - (h / 2)) * (h > w ? (w / h) : 1),
			direction = Math.round((((Math.atan2(y, x) * (180 / Math.PI)) + 180) / 90) + 3) % 4;

			console.log('x' + x)
			console.log('direction' + direction)
			return direction;
	}
	SlipHover.prototype.createOverlay = function(instance, direction, $element) {
		var left, bottom, $overlay, content, $overlayColor;
		switch (direction) {
			case 0:
				left = 0;
				bottom = '100%';
				break;
			case 1: 
				left = '100%';
				bottom = 0;
				break;
			case 2: 
				left = 0;
				bottom = '-100%';
				break;	
			case 3: 
				left = '-100%';
				bottom = 0;
				break;
			default:
				window.console.error('error when get direction of the mouse'); 		
		}
		if(instance.settings.verticalMiddle) {
			content = $('<div></div>').css({
				display: 'table-cell',
				verticalAlign: 'middle'
			}).html($element.attr(instance.settings.caption))
		}else {
			content = $element.attr(instance.settings.caption)
		}
		$overlayColor = instance.settings.backgroundColorAttr ?
              $element.attr(instance.settings.backgroundColorAttr) : instance.settings.backgroundColor;
		$overlay = $("<div class='sliphover-overlay'></div>").css({
			width: '100%',
			height: instance.settings.height,
			position: 'absolute',
			left: left,
			bottom: bottom,
			textAlign: instance.settings.textAlign,
            color: instance.settings.fontColor,
            backgroundColor: $overlayColor
		}).html(content)
		return $overlay;
	}
	SlipHover.prototype.slideIn = function(instance, $overlay) {
		 $overlay.stop().animate({
                left: 0,
                bottom: 0
            }, instance.settings.duration);
	}
	SlipHover.prototype.removeOverlay = function(instance, $overlayContainer, direction) {
		var finalState, $overlay = $overlayContainer.find('.sliphover-overlay');
		switch (direction) {
			case 0: 
				finalState = {
					left: 0,
					bottom: '100%'
				}
				break;
			case 1: 
				finalState = {
					left: '100%',
					bottom: 0
				}
				break;
			case 2: 
				finalState = {
					left: 0,
					bottom: '-100%'
				}
				break;
			case 3: 
				finalState = {
					left: '-100%',
					bottom: 0
				}
				break;
			default:
                window.console.error('error when get direction of the mouse');					
		}
		//slide out
        $overlay.stop().animate(finalState, instance.settings.duration, function() {
            $overlayContainer.remove();
        });	
	}
	$.fn[pluginName] = function(options) {
		this.each(function() {
			if (!$.data(this, 'plugin_' + pluginName)) {
				$.data(this, 'plugin_' + pluginName, new SlipHover(this, options))
			}
		})
		return this;
	}
})(jQuery, window, document)