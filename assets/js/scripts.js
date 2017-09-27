/*!
 * jQuery UI Widget 1.12.1
 * http://jqueryui.com
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */

//>>label: Widget
//>>group: Core
//>>description: Provides a factory for creating stateful widgets with a common API.
//>>docs: http://api.jqueryui.com/jQuery.widget/
//>>demos: http://jqueryui.com/widget/

( function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [ "jquery", "./version" ], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function( $ ) {

var widgetUuid = 0;
var widgetSlice = Array.prototype.slice;

$.cleanData = ( function( orig ) {
	return function( elems ) {
		var events, elem, i;
		for ( i = 0; ( elem = elems[ i ] ) != null; i++ ) {
			try {

				// Only trigger remove when necessary to save time
				events = $._data( elem, "events" );
				if ( events && events.remove ) {
					$( elem ).triggerHandler( "remove" );
				}

			// Http://bugs.jquery.com/ticket/8235
			} catch ( e ) {}
		}
		orig( elems );
	};
} )( $.cleanData );

$.widget = function( name, base, prototype ) {
	var existingConstructor, constructor, basePrototype;

	// ProxiedPrototype allows the provided prototype to remain unmodified
	// so that it can be used as a mixin for multiple widgets (#8876)
	var proxiedPrototype = {};

	var namespace = name.split( "." )[ 0 ];
	name = name.split( "." )[ 1 ];
	var fullName = namespace + "-" + name;

	if ( !prototype ) {
		prototype = base;
		base = $.Widget;
	}

	if ( $.isArray( prototype ) ) {
		prototype = $.extend.apply( null, [ {} ].concat( prototype ) );
	}

	// Create selector for plugin
	$.expr[ ":" ][ fullName.toLowerCase() ] = function( elem ) {
		return !!$.data( elem, fullName );
	};

	$[ namespace ] = $[ namespace ] || {};
	existingConstructor = $[ namespace ][ name ];
	constructor = $[ namespace ][ name ] = function( options, element ) {

		// Allow instantiation without "new" keyword
		if ( !this._createWidget ) {
			return new constructor( options, element );
		}

		// Allow instantiation without initializing for simple inheritance
		// must use "new" keyword (the code above always passes args)
		if ( arguments.length ) {
			this._createWidget( options, element );
		}
	};

	// Extend with the existing constructor to carry over any static properties
	$.extend( constructor, existingConstructor, {
		version: prototype.version,

		// Copy the object used to create the prototype in case we need to
		// redefine the widget later
		_proto: $.extend( {}, prototype ),

		// Track widgets that inherit from this widget in case this widget is
		// redefined after a widget inherits from it
		_childConstructors: []
	} );

	basePrototype = new base();

	// We need to make the options hash a property directly on the new instance
	// otherwise we'll modify the options hash on the prototype that we're
	// inheriting from
	basePrototype.options = $.widget.extend( {}, basePrototype.options );
	$.each( prototype, function( prop, value ) {
		if ( !$.isFunction( value ) ) {
			proxiedPrototype[ prop ] = value;
			return;
		}
		proxiedPrototype[ prop ] = ( function() {
			function _super() {
				return base.prototype[ prop ].apply( this, arguments );
			}

			function _superApply( args ) {
				return base.prototype[ prop ].apply( this, args );
			}

			return function() {
				var __super = this._super;
				var __superApply = this._superApply;
				var returnValue;

				this._super = _super;
				this._superApply = _superApply;

				returnValue = value.apply( this, arguments );

				this._super = __super;
				this._superApply = __superApply;

				return returnValue;
			};
		} )();
	} );
	constructor.prototype = $.widget.extend( basePrototype, {

		// TODO: remove support for widgetEventPrefix
		// always use the name + a colon as the prefix, e.g., draggable:start
		// don't prefix for widgets that aren't DOM-based
		widgetEventPrefix: existingConstructor ? ( basePrototype.widgetEventPrefix || name ) : name
	}, proxiedPrototype, {
		constructor: constructor,
		namespace: namespace,
		widgetName: name,
		widgetFullName: fullName
	} );

	// If this widget is being redefined then we need to find all widgets that
	// are inheriting from it and redefine all of them so that they inherit from
	// the new version of this widget. We're essentially trying to replace one
	// level in the prototype chain.
	if ( existingConstructor ) {
		$.each( existingConstructor._childConstructors, function( i, child ) {
			var childPrototype = child.prototype;

			// Redefine the child widget using the same prototype that was
			// originally used, but inherit from the new version of the base
			$.widget( childPrototype.namespace + "." + childPrototype.widgetName, constructor,
				child._proto );
		} );

		// Remove the list of existing child constructors from the old constructor
		// so the old child constructors can be garbage collected
		delete existingConstructor._childConstructors;
	} else {
		base._childConstructors.push( constructor );
	}

	$.widget.bridge( name, constructor );

	return constructor;
};

$.widget.extend = function( target ) {
	var input = widgetSlice.call( arguments, 1 );
	var inputIndex = 0;
	var inputLength = input.length;
	var key;
	var value;

	for ( ; inputIndex < inputLength; inputIndex++ ) {
		for ( key in input[ inputIndex ] ) {
			value = input[ inputIndex ][ key ];
			if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {

				// Clone objects
				if ( $.isPlainObject( value ) ) {
					target[ key ] = $.isPlainObject( target[ key ] ) ?
						$.widget.extend( {}, target[ key ], value ) :

						// Don't extend strings, arrays, etc. with objects
						$.widget.extend( {}, value );

				// Copy everything else by reference
				} else {
					target[ key ] = value;
				}
			}
		}
	}
	return target;
};

$.widget.bridge = function( name, object ) {
	var fullName = object.prototype.widgetFullName || name;
	$.fn[ name ] = function( options ) {
		var isMethodCall = typeof options === "string";
		var args = widgetSlice.call( arguments, 1 );
		var returnValue = this;

		if ( isMethodCall ) {

			// If this is an empty collection, we need to have the instance method
			// return undefined instead of the jQuery instance
			if ( !this.length && options === "instance" ) {
				returnValue = undefined;
			} else {
				this.each( function() {
					var methodValue;
					var instance = $.data( this, fullName );

					if ( options === "instance" ) {
						returnValue = instance;
						return false;
					}

					if ( !instance ) {
						return $.error( "cannot call methods on " + name +
							" prior to initialization; " +
							"attempted to call method '" + options + "'" );
					}

					if ( !$.isFunction( instance[ options ] ) || options.charAt( 0 ) === "_" ) {
						return $.error( "no such method '" + options + "' for " + name +
							" widget instance" );
					}

					methodValue = instance[ options ].apply( instance, args );

					if ( methodValue !== instance && methodValue !== undefined ) {
						returnValue = methodValue && methodValue.jquery ?
							returnValue.pushStack( methodValue.get() ) :
							methodValue;
						return false;
					}
				} );
			}
		} else {

			// Allow multiple hashes to be passed on init
			if ( args.length ) {
				options = $.widget.extend.apply( null, [ options ].concat( args ) );
			}

			this.each( function() {
				var instance = $.data( this, fullName );
				if ( instance ) {
					instance.option( options || {} );
					if ( instance._init ) {
						instance._init();
					}
				} else {
					$.data( this, fullName, new object( options, this ) );
				}
			} );
		}

		return returnValue;
	};
};

$.Widget = function( /* options, element */ ) {};
$.Widget._childConstructors = [];

$.Widget.prototype = {
	widgetName: "widget",
	widgetEventPrefix: "",
	defaultElement: "<div>",

	options: {
		classes: {},
		disabled: false,

		// Callbacks
		create: null
	},

	_createWidget: function( options, element ) {
		element = $( element || this.defaultElement || this )[ 0 ];
		this.element = $( element );
		this.uuid = widgetUuid++;
		this.eventNamespace = "." + this.widgetName + this.uuid;

		this.bindings = $();
		this.hoverable = $();
		this.focusable = $();
		this.classesElementLookup = {};

		if ( element !== this ) {
			$.data( element, this.widgetFullName, this );
			this._on( true, this.element, {
				remove: function( event ) {
					if ( event.target === element ) {
						this.destroy();
					}
				}
			} );
			this.document = $( element.style ?

				// Element within the document
				element.ownerDocument :

				// Element is window or document
				element.document || element );
			this.window = $( this.document[ 0 ].defaultView || this.document[ 0 ].parentWindow );
		}

		this.options = $.widget.extend( {},
			this.options,
			this._getCreateOptions(),
			options );

		this._create();

		if ( this.options.disabled ) {
			this._setOptionDisabled( this.options.disabled );
		}

		this._trigger( "create", null, this._getCreateEventData() );
		this._init();
	},

	_getCreateOptions: function() {
		return {};
	},

	_getCreateEventData: $.noop,

	_create: $.noop,

	_init: $.noop,

	destroy: function() {
		var that = this;

		this._destroy();
		$.each( this.classesElementLookup, function( key, value ) {
			that._removeClass( value, key );
		} );

		// We can probably remove the unbind calls in 2.0
		// all event bindings should go through this._on()
		this.element
			.off( this.eventNamespace )
			.removeData( this.widgetFullName );
		this.widget()
			.off( this.eventNamespace )
			.removeAttr( "aria-disabled" );

		// Clean up events and states
		this.bindings.off( this.eventNamespace );
	},

	_destroy: $.noop,

	widget: function() {
		return this.element;
	},

	option: function( key, value ) {
		var options = key;
		var parts;
		var curOption;
		var i;

		if ( arguments.length === 0 ) {

			// Don't return a reference to the internal hash
			return $.widget.extend( {}, this.options );
		}

		if ( typeof key === "string" ) {

			// Handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
			options = {};
			parts = key.split( "." );
			key = parts.shift();
			if ( parts.length ) {
				curOption = options[ key ] = $.widget.extend( {}, this.options[ key ] );
				for ( i = 0; i < parts.length - 1; i++ ) {
					curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
					curOption = curOption[ parts[ i ] ];
				}
				key = parts.pop();
				if ( arguments.length === 1 ) {
					return curOption[ key ] === undefined ? null : curOption[ key ];
				}
				curOption[ key ] = value;
			} else {
				if ( arguments.length === 1 ) {
					return this.options[ key ] === undefined ? null : this.options[ key ];
				}
				options[ key ] = value;
			}
		}

		this._setOptions( options );

		return this;
	},

	_setOptions: function( options ) {
		var key;

		for ( key in options ) {
			this._setOption( key, options[ key ] );
		}

		return this;
	},

	_setOption: function( key, value ) {
		if ( key === "classes" ) {
			this._setOptionClasses( value );
		}

		this.options[ key ] = value;

		if ( key === "disabled" ) {
			this._setOptionDisabled( value );
		}

		return this;
	},

	_setOptionClasses: function( value ) {
		var classKey, elements, currentElements;

		for ( classKey in value ) {
			currentElements = this.classesElementLookup[ classKey ];
			if ( value[ classKey ] === this.options.classes[ classKey ] ||
					!currentElements ||
					!currentElements.length ) {
				continue;
			}

			// We are doing this to create a new jQuery object because the _removeClass() call
			// on the next line is going to destroy the reference to the current elements being
			// tracked. We need to save a copy of this collection so that we can add the new classes
			// below.
			elements = $( currentElements.get() );
			this._removeClass( currentElements, classKey );

			// We don't use _addClass() here, because that uses this.options.classes
			// for generating the string of classes. We want to use the value passed in from
			// _setOption(), this is the new value of the classes option which was passed to
			// _setOption(). We pass this value directly to _classes().
			elements.addClass( this._classes( {
				element: elements,
				keys: classKey,
				classes: value,
				add: true
			} ) );
		}
	},

	_setOptionDisabled: function( value ) {
		this._toggleClass( this.widget(), this.widgetFullName + "-disabled", null, !!value );

		// If the widget is becoming disabled, then nothing is interactive
		if ( value ) {
			this._removeClass( this.hoverable, null, "ui-state-hover" );
			this._removeClass( this.focusable, null, "ui-state-focus" );
		}
	},

	enable: function() {
		return this._setOptions( { disabled: false } );
	},

	disable: function() {
		return this._setOptions( { disabled: true } );
	},

	_classes: function( options ) {
		var full = [];
		var that = this;

		options = $.extend( {
			element: this.element,
			classes: this.options.classes || {}
		}, options );

		function processClassString( classes, checkOption ) {
			var current, i;
			for ( i = 0; i < classes.length; i++ ) {
				current = that.classesElementLookup[ classes[ i ] ] || $();
				if ( options.add ) {
					current = $( $.unique( current.get().concat( options.element.get() ) ) );
				} else {
					current = $( current.not( options.element ).get() );
				}
				that.classesElementLookup[ classes[ i ] ] = current;
				full.push( classes[ i ] );
				if ( checkOption && options.classes[ classes[ i ] ] ) {
					full.push( options.classes[ classes[ i ] ] );
				}
			}
		}

		this._on( options.element, {
			"remove": "_untrackClassesElement"
		} );

		if ( options.keys ) {
			processClassString( options.keys.match( /\S+/g ) || [], true );
		}
		if ( options.extra ) {
			processClassString( options.extra.match( /\S+/g ) || [] );
		}

		return full.join( " " );
	},

	_untrackClassesElement: function( event ) {
		var that = this;
		$.each( that.classesElementLookup, function( key, value ) {
			if ( $.inArray( event.target, value ) !== -1 ) {
				that.classesElementLookup[ key ] = $( value.not( event.target ).get() );
			}
		} );
	},

	_removeClass: function( element, keys, extra ) {
		return this._toggleClass( element, keys, extra, false );
	},

	_addClass: function( element, keys, extra ) {
		return this._toggleClass( element, keys, extra, true );
	},

	_toggleClass: function( element, keys, extra, add ) {
		add = ( typeof add === "boolean" ) ? add : extra;
		var shift = ( typeof element === "string" || element === null ),
			options = {
				extra: shift ? keys : extra,
				keys: shift ? element : keys,
				element: shift ? this.element : element,
				add: add
			};
		options.element.toggleClass( this._classes( options ), add );
		return this;
	},

	_on: function( suppressDisabledCheck, element, handlers ) {
		var delegateElement;
		var instance = this;

		// No suppressDisabledCheck flag, shuffle arguments
		if ( typeof suppressDisabledCheck !== "boolean" ) {
			handlers = element;
			element = suppressDisabledCheck;
			suppressDisabledCheck = false;
		}

		// No element argument, shuffle and use this.element
		if ( !handlers ) {
			handlers = element;
			element = this.element;
			delegateElement = this.widget();
		} else {
			element = delegateElement = $( element );
			this.bindings = this.bindings.add( element );
		}

		$.each( handlers, function( event, handler ) {
			function handlerProxy() {

				// Allow widgets to customize the disabled handling
				// - disabled as an array instead of boolean
				// - disabled class as method for disabling individual parts
				if ( !suppressDisabledCheck &&
						( instance.options.disabled === true ||
						$( this ).hasClass( "ui-state-disabled" ) ) ) {
					return;
				}
				return ( typeof handler === "string" ? instance[ handler ] : handler )
					.apply( instance, arguments );
			}

			// Copy the guid so direct unbinding works
			if ( typeof handler !== "string" ) {
				handlerProxy.guid = handler.guid =
					handler.guid || handlerProxy.guid || $.guid++;
			}

			var match = event.match( /^([\w:-]*)\s*(.*)$/ );
			var eventName = match[ 1 ] + instance.eventNamespace;
			var selector = match[ 2 ];

			if ( selector ) {
				delegateElement.on( eventName, selector, handlerProxy );
			} else {
				element.on( eventName, handlerProxy );
			}
		} );
	},

	_off: function( element, eventName ) {
		eventName = ( eventName || "" ).split( " " ).join( this.eventNamespace + " " ) +
			this.eventNamespace;
		element.off( eventName ).off( eventName );

		// Clear the stack to avoid memory leaks (#10056)
		this.bindings = $( this.bindings.not( element ).get() );
		this.focusable = $( this.focusable.not( element ).get() );
		this.hoverable = $( this.hoverable.not( element ).get() );
	},

	_delay: function( handler, delay ) {
		function handlerProxy() {
			return ( typeof handler === "string" ? instance[ handler ] : handler )
				.apply( instance, arguments );
		}
		var instance = this;
		return setTimeout( handlerProxy, delay || 0 );
	},

	_hoverable: function( element ) {
		this.hoverable = this.hoverable.add( element );
		this._on( element, {
			mouseenter: function( event ) {
				this._addClass( $( event.currentTarget ), null, "ui-state-hover" );
			},
			mouseleave: function( event ) {
				this._removeClass( $( event.currentTarget ), null, "ui-state-hover" );
			}
		} );
	},

	_focusable: function( element ) {
		this.focusable = this.focusable.add( element );
		this._on( element, {
			focusin: function( event ) {
				this._addClass( $( event.currentTarget ), null, "ui-state-focus" );
			},
			focusout: function( event ) {
				this._removeClass( $( event.currentTarget ), null, "ui-state-focus" );
			}
		} );
	},

	_trigger: function( type, event, data ) {
		var prop, orig;
		var callback = this.options[ type ];

		data = data || {};
		event = $.Event( event );
		event.type = ( type === this.widgetEventPrefix ?
			type :
			this.widgetEventPrefix + type ).toLowerCase();

		// The original event may come from any element
		// so we need to reset the target on the new event
		event.target = this.element[ 0 ];

		// Copy original event properties over to the new event
		orig = event.originalEvent;
		if ( orig ) {
			for ( prop in orig ) {
				if ( !( prop in event ) ) {
					event[ prop ] = orig[ prop ];
				}
			}
		}

		this.element.trigger( event, data );
		return !( $.isFunction( callback ) &&
			callback.apply( this.element[ 0 ], [ event ].concat( data ) ) === false ||
			event.isDefaultPrevented() );
	}
};

$.each( { show: "fadeIn", hide: "fadeOut" }, function( method, defaultEffect ) {
	$.Widget.prototype[ "_" + method ] = function( element, options, callback ) {
		if ( typeof options === "string" ) {
			options = { effect: options };
		}

		var hasOptions;
		var effectName = !options ?
			method :
			options === true || typeof options === "number" ?
				defaultEffect :
				options.effect || defaultEffect;

		options = options || {};
		if ( typeof options === "number" ) {
			options = { duration: options };
		}

		hasOptions = !$.isEmptyObject( options );
		options.complete = callback;

		if ( options.delay ) {
			element.delay( options.delay );
		}

		if ( hasOptions && $.effects && $.effects.effect[ effectName ] ) {
			element[ method ]( options );
		} else if ( effectName !== method && element[ effectName ] ) {
			element[ effectName ]( options.duration, options.easing, callback );
		} else {
			element.queue( function( next ) {
				$( this )[ method ]();
				if ( callback ) {
					callback.call( element[ 0 ] );
				}
				next();
			} );
		}
	};
} );

return $.widget;

} ) );

var debug = true;

// var initApp = function() {
//   if (!localStorage.getItem('hljs-theme')) {
//      var theme = "dark";
//      localStorage.setItem('hljs-theme', theme);
//   }
// };
// initApp();

$.urlParam = function(name){
  var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
  if (results) return results[1] || 0;
};

// Load localStorage
var useStorage = function() {
  try {
    return 'localStorage' in window && window.localStorage !== null;
  } catch (e) {
    return false;
  }
};

var time = Date.now || function() {
  return +new Date();
};

// sort on key values
// function byKey(key, desc) {
//   return function(a,b){
//    return desc ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);
//   };
// }

// Open in Command Reference
function docsPage() {
  transformPage();
  searchText = $("#search-input").val();
  window.location.href = '/Documentation/Reference/'+searchText+'.html';
  // saveSearch(searchText);
}

// search DuckDuckGo
function duckDuckGo() {
  transformPage();
  searchText = $("#search-input").val();
  injectFrame("https://duckduckgo.com/?sites=nsis.sourceforge.net&ka=h&k7=%23f5f4f3&kj=%236f6171&ky=%23ffffff&kx=b&kt=Segoe+UI&q="+searchText);
  // saveSearch(searchText);
}

// load bookmarks from localStorage
var getBookmarks = function() {
    var i = [];
    if( localStorage.getItem('bookmarks') !== null ) {
        if (debug) console.log("Loading bookmarks from locationStorage");
        i = JSON.parse(localStorage.getItem('bookmarks'));
    }
    return i;
};

// // save bookmarks to localStorage
// var setBootmarks = function(arr) {
//     if (debug) console.log("Saving bookmarks to locationStorage");
//     localStorage.setItem('bookmarks', JSON.stringify(arr));
// };

// // populate bookmarks menu
// var initBookmarks = function() {

//     var bookmarks = getBookmarks();

//     if (bookmarks.length > 0) {
//         $("#bookmarks-menu").removeClass('hidden');
//         var html = "";
//         bookmarks.forEach(function(item) {
//             if (typeof item !== 'undefined' && item !== null) {
//                 html += '\n<li><a href="'+item.url+'" rel="bookmark">'+item.name+'</a></li>';
//             }
//         });

//         $('#bookmarks-menu ul .divider').nextAll().remove();
//         $('#bookmarks-menu ul').append(html);
//     } else {
//       $('.bookmark-manager').modal('hide');
//       $("#bookmarks-menu").addClass('hidden');
//     }
// };

// var getModalHeader = function(classes, name) {
//   var header = "<div class=\""+classes+" modal fade\" tabindex=\"-1\" role=\"dialog\">";
//   header += "\n  <div class=\"modal-dialog\">";
//   header += "\n    <div class=\"modal-content\">";
//   header += "\n      <div class=\"modal-header\">";
//   header += "\n        <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>";
//   header += "\n        <h4 class=\"modal-title\">"+name+"</h4>";
//   header += "\n      </div>";
//   header += "\n      <div class=\"modal-body\">";
//   return header;
// };

// var getModalFooter = function(button) {
//   var footer = "\n      </div>";
//   footer += "\n      <div class=\"modal-footer\">";
//   footer += "\n        <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">"+button+"</button>";
//   footer += "\n      </div>";
//   footer += "\n    </div>";
//   footer += "\n  </div>";
//   footer += "\n</div>";
//   return footer;
// };

// var showSettings = function() {
//   if (debug) console.log('Showing page settings');

//   $('.modal').remove();

//   var dark   = "";
//   var light  = "";
//   var custom = " hidden";

//   if ( localStorage.getItem('hljs-theme') === 'dark' ) {
//      dark  = " active";
//   } else if( localStorage.getItem('hljs-theme') === 'light' ) {
//      light = " active";
//   } else {
//     custom = " active";
//   }

//   modal = getModalHeader('page-settings', 'Page Settings');
//   // modal += "<p>Search engine:&nbsp;</p>";
//   // modal += "<div class=\"btn-group\" role=\"group\">";
//   // modal += "  <button type=\"button\" class=\"btn btn-default set-search\">DuckDuckGo</button>";
//   // modal += "  <button type=\"button\" class=\"btn btn-default set-search\">Bing</button>";
//   // modal += "  <button type=\"button\" class=\"btn btn-default set-search\">Google</button>";
//   // modal += "</div>";
//   modal += "<p>Highlighter theme:&nbsp;</p>";
//   modal += "<div class=\"btn-group switch\" role=\"group\">";
//   modal += "  <button type=\"button\" class=\"btn btn-switch set-highlighter"+dark+"\">Dark</button>";
//   modal += "  <button type=\"button\" class=\"btn btn-switch set-highlighter"+light+"\">Light</button>";
//   modal += "  <button type=\"button\" class=\"btn btn-switch custom-theme"+custom+"\">Custom</button>";
//   modal += "</div>";
//   modal += getModalFooter('Close');

//   $('body').append(modal);
//   $('.page-settings').modal('show');
// };

// body = $('.navbar>div:not(.container-fluid)').children();
function injectFrame(src) {
  // $('.navbar>div').replaceWith(body);
  $("#content").replaceWith("<div id=\"content\" style=\"position:absolute\"><iframe width=\"100%\" height=\"100%\" frameBorder=\"0\" src=\""+src+"\"></iframe></div>");
}

function transformPage() {
  // collapse main dropdown
  $('.ui-autocomplete').css({display: 'none'});

  // collapse mobile menu
  $('#nsis-navbar-collapse').removeClass('in');

  // remove outer scrollbar
  $('body').css({overflow: 'hidden'});
}

// Case sensitive inArray
function inArrayS(needle, haystackArray){
    var defaultResult = -1;
    var result = defaultResult;
    $.each(haystackArray, function(index, value) {
        if (result == defaultResult && value.label.toLowerCase() == needle.toLowerCase()) {
            result = index;
        }
    });
    return result;
}

// Search hinting
$.widget( "custom.hint", $.ui.autocomplete, {
    _create: function() {
      this._super();
      this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)" );
    },
    _renderMenu: function( ul, items ) {
      var that = this;
      var currentCategory = "";

      $.each( items, function( index, item ) {
        var li;
        if ( item.category != currentCategory ) {
          ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
          currentCategory = item.category;
        }
        li = that._renderItemData( ul, item );
        if ( item.category ) {
          li.attr( "aria-label", item.category + " : " + item.label );
        }
      });
    }
});
$(function() {

  function locationHashChanged() {
    var hash = location.hash;

    switch (hash) {
      case "#forum":
      case "#forums":
      url = "http://forums.winamp.com/forumdisplay.php?forumid=65";
      break;
      case "#wiki":
      url = "http://nsis.sourceforge.net";
      break;

      default:
      return false;
    }

    transformPage();
    injectFrame(url);
  }

  hash = window.location.hash;
  if( hash !== "") {
    locationHashChanged();
  }

  window.onhashchange = locationHashChanged;

});
var m,
Modal = {

  // config: {
  //   saveButton: $('.save-bookmark'),
  //   sortButton: $('.sort-bookmark'),
  //   manageButton: $('.manage-bookmarks')
  // },


  init: function() {
    // m = this.config;
    this.events();
  },

  // click events
  events: function() {
  },

  header: function(classes, name) {
    var header = "<div class=\""+classes+" modal fade\" tabindex=\"-1\" role=\"dialog\">";
    header += "\n  <div class=\"modal-dialog\">";
    header += "\n    <div class=\"modal-content\">";
    header += "\n      <div class=\"modal-header\">";
    header += "\n        <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>";
    header += "\n        <h4 class=\"modal-title\">"+name+"</h4>";
    header += "\n      </div>";
    header += "\n      <div class=\"modal-body\">";
    return header;
  },

  footer: function(button) {
    var footer = "\n      </div>";
    footer += "\n      <div class=\"modal-footer\">";
    footer += "\n        <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">"+button+"</button>";
    footer += "\n      </div>";
    footer += "\n    </div>";
    footer += "\n  </div>";
    footer += "\n</div>";
    return footer;
  }

};
var debug = true;

var b,
Bookmarks = {

  config: {
    saveButton: $('.save-bookmark'),
    sortButton: $('.sort-bookmark'),
    manageButton: $('.manage-bookmarks'),
    deleteButton: $('.delete-bookmark')
  },


  init: function() {
    b = this.config;
    this.events();
    this.populate()
  },


  // click events
  events: function() {
    b.saveButton.click(function(event) {
      Bookmarks.save();
    });

    b.sortButton.click(function(event) {
      Bookmarks.sort();
    });

    b.manageButton.click(function(event) {
      Bookmarks.manage();
    });

    $('body').on('click', '.delete-bookmark', function (event) {
      Bookmarks.delete($(this));
    });
  },


  // populate menu with bookmarks
  populate: function() {
    var bookmarks = this.getItem();

    if (bookmarks.length > 0) {
        $("#bookmarks-menu").removeClass('hidden');
        var html = "";
        bookmarks.forEach(function(item) {
            if (typeof item !== 'undefined' && item !== null) {
                html += '\n<li><a href="'+item.url+'" rel="bookmark">'+item.name+'</a></li>';
            }
        });

        $('#bookmarks-menu ul .divider').nextAll().remove();
        $('#bookmarks-menu ul').append(html);
    } else {
      $('.bookmark-manager').modal('hide');
      $("#bookmarks-menu").addClass('hidden');
    }
  },


  // launch bookmarks manager
  manage: function() {
    event.preventDefault();

    if (debug) console.log("Launching bookmark manager");

    $('.modal').remove();

    var bookmarks = this.getItem();

    modal = Modal.header('bookmark-manager', 'Bookmark Manager');
    modal += "\n        <div class=\"table-responsive\">";
    modal += "\n          <table class=\"table table-hover table-striped\">";
    modal += "\n            <tbody>";

    bookmarks.forEach(function(item) {
        if (typeof item !== 'undefined') {
            modal += "\n                <tr>";
            modal += '\n                  <td>'+item.name+'<br><a href="'+item.url+'" class="text-muted small bookmark-url">'+item.url+'</a></td>';
            modal += '\n                  <td class="text-right"><button type=button class="btn btn-sm btn-danger delete-bookmark"">Remove</button></td>';
            modal += "\n                </tr>";
        }
    });

    modal += "\n            </tbody>";
    modal += "\n          </table>";
    modal += "\n        </div>";
    modal += Modal.footer('Close');

    $('body').append(modal);
    $('.bookmark-manager').modal('show');
  },


  // sort bookmarks
  sort: function() {
    event.preventDefault();

    var bookmarks = this.getItem();

    if (debug) console.log("Sorting bookmarks");
    bookmarks.sort(byKey('name'));
    this.setItem(bookmarks);
    this.populate();
  },


  // delete bookmark
  delete: function(el) {
    event.preventDefault();


    if (debug) console.log("Delete bookmark");
    var url = el.parent('td').prev('td').children('.bookmark-url').text();
    el.closest('tr').hide();
    var bookmarks = getBookmarks();

    // Remove from localStorage
    if (bookmarks.length > 0) {
        for (var i = bookmarks.length - 1; i >= 0; i--) {
            if (bookmarks[i].url === url) {
                if (debug) console.log("Deleting bookmark");
                bookmarks.splice(i,1);
            }
        }
    }

    this.setItem(bookmarks);
    this.populate();
  },


  // save bookmarks
  save: function() {
    event.preventDefault();

    var bookmarks = this.getItem();

    var name = document.title;
    var suffix = ' | Nullsoft Scriptable Install System';

    var count = name - suffix;

    if (name.endsWith(suffix)) {
        name = name.slice(0, -suffix.length);
    }

    var url = window.location.href;
    var duplicate = false;

    // Duplicate?
    if (bookmarks.length > 0) {
        bookmarks.forEach(function(item) {
            if (item.url === url) {
                duplicate = true;
            }
        });
    }

    // Add bookmark
    if (duplicate === true)  {
        if (debug) console.log("Duplicate link, skipping "+url);
    } else {
        console.log("Saving bookmark "+url);
        bookmarks.push({
            name: name,
            url: url
        });
        this.setItem(bookmarks);
        $('#bookmarks-menu ul').append('\n<li><a href="'+url+'" rel="bookmark">'+name+'</a></li>');
        $("#bookmarks-menu").removeClass('hidden');
    }
  },


  // load bookmarks from localStorage
  getItem: function() {
    var i = [];
    if( localStorage.getItem('bookmarks') !== null ) {
        if (debug) console.log("Loading bookmarks from locationStorage");
        i = JSON.parse(localStorage.getItem('bookmarks'));
    }
    return i;
  },


  // save bookmarks to localStorage
  setItem: function(arr) {
    if (debug) console.log("Saving bookmarks to locationStorage");
    localStorage.setItem('bookmarks', JSON.stringify(arr));
  },


};
var p,
Preferences = {

  config: {
    setupButton: $('.setup-page'),
    switchButton: $('.set-highlighter'),
    customTheme: $('.custom-theme'),
  },


  init: function() {
    p = this.config;
    this.events();
  },


  // click events
  events: function() {
    p.setupButton.click(function(event) {
      Preferences.show();
    });

    $('body').on('click', '.set-highlighter', function (event) {
      Preferences.switch();
    });
  },

  // populate menu with bookmarks
  show: function() {
    event.preventDefault();
    this.modal();
  },


  switch: function() {
    if (debug) console.log('Switching theme');

    $('.set-highlighter').removeClass("active");
    p.customTheme.addClass('hidden');
    $(event.target).addClass("active");

    var text = $(event.target).text().toLowerCase();
    // var theme;

    if ((text === "dark") || (text === "light")) {
        $('body').removeClass('hljs-dark hljs-light').addClass('hljs-' + text);
        $('.hljs-theme').attr('href', window.location.host + '/assets/css/highlight.min.css');
        localStorage.setItem('hljs-theme', text);
    }
    if (debug) console.log("Highlighter is set to " + text);
  },


  modal: function() {
    if (debug) console.log('Showing page settings');

    $('.modal').remove();

    var dark   = "";
    var light  = "";
    var custom = " hidden";

    var theme = localStorage.getItem('hljs-theme');

    console.log("Selected theme: " + theme);

    if ( theme === 'dark' ) {
       dark  = " active";
    } else if( theme === 'light' ) {
       light = " active";
    } else {
      custom = " active";
    }

    modal = Modal.header('page-settings', 'Page Settings');
    // modal += "<p>Search engine:&nbsp;</p>";
    // modal += "<div class=\"btn-group\" role=\"group\">";
    // modal += "  <button type=\"button\" class=\"btn btn-default set-search\">DuckDuckGo</button>";
    // modal += "  <button type=\"button\" class=\"btn btn-default set-search\">Bing</button>";
    // modal += "  <button type=\"button\" class=\"btn btn-default set-search\">Google</button>";
    // modal += "</div>";
    modal += "<p>Highlighter theme:</p>";
    modal += "<div class=\"btn-group switch\" role=\"group\">";
    modal += "  <button type=\"button\" class=\"btn btn-switch set-highlighter"+dark+"\">Dark</button>";
    modal += "  <button type=\"button\" class=\"btn btn-switch set-highlighter"+light+"\">Light</button>";
    modal += "  <button type=\"button\" class=\"btn btn-switch custom-theme"+custom+"\">Custom</button>";
    modal += "</div>";
    modal += Modal.footer('Close');

    $('body').append(modal);
    $('.page-settings').modal('show');
  }
};

//   $(function() {

//     $('.setup-page').click(function(event) {

//         event.preventDefault();
//         showSettings();
//     });

//     $('body').on('click', p.switchButton, function (event) {
//         $(p.highlighter).removeClass("active");
//         $('.custom-theme').addClass('hidden');
//         $(this).addClass("active");

//         var text = $(this).text().toLowerCase();
//         var theme;

//         if ((text === "dark") || (text === "light")) {
//             $('body').removeClass('hljs-dark hljs-light').addClass('hljs-' + text);
//             // theme = "assets/css/highlighter.css";
//             $('.hljs-theme').attr('href', 'assets/css/highlighter.css');
//             localStorage.setItem('hljs-theme', text);
//         // } else {
//         //     theme = "assets/css/"+text+".css";
//         //     localStorage.setItem('hljs-theme', theme);
//         }

//         if (debug) console.log("Highlighter is set to " + text);


//         // $('.hljs-theme').attr("href", theme);

//     });

// });
// $(function() {

//     $('.manage-bookmarks').click(function(event) {

//         event.preventDefault();

//         if (debug) console.log("Launching bookmark manager");

//         $('.modal').remove();

//         var bookmarks = getBookmarks();

//         modal = getModalHeader('bookmark-manager', 'Bookmark Manager');
//         modal += "\n        <div class=\"table-responsive\">";
//         modal += "\n          <table class=\"table table-hover table-striped\">";
//         modal += "\n            <tbody>";

//         bookmarks.forEach(function(item) {
//             if (typeof item !== 'undefined') {
//                 modal += "\n                <tr>";
//                 modal += '\n                  <td>'+item.name+'<br><a href="'+item.url+'" class="text-muted small bookmark-url">'+item.url+'</a></td>';
//                 modal += '\n                  <td class="text-right"><button type=button class="btn btn-sm btn-danger delete-bookmark"">Remove</button></td>';
//                 modal += "\n                </tr>";
//             }
//         });

//         modal += "\n            </tbody>";
//         modal += "\n          </table>";
//         modal += "\n        </div>";
//         modal += getModalFooter('Close');

//         $('body').append(modal);
//         $('.bookmark-manager').modal('show');
//     });

//     $('body').on('click', '.delete-bookmark', function (event) {

//         event.preventDefault();
//         var $this = $(this);
//         var url = $this.parent('td').prev('td').children('.bookmark-url').text();
//         $this.closest('tr').hide();
//         var bookmarks = getBookmarks();

//         // Remove from localStorage
//         if (bookmarks.length > 0) {
//             for (var i = bookmarks.length - 1; i >= 0; i--) {
//                 if (bookmarks[i].url === url) {
//                     if (debug) console.log("Deleting bookmark");
//                     bookmarks.splice(i,1);
//                 }
//             }
//         }

//         setBootmarks(bookmarks);
//         initBookmarks();
//     });
// });
var k,
Keyboard = {

  config: {
    input:  $("#search-input")
  },

  init: function() {
    m = this.config;
    this.events();
  },

  // Keyboard events
  events: function() {
    $(document).bind('keyup', function(event) {
      Keyboard.focus();
    });
  },

  
  focus: function() {
    if (event.which === 70) {
        if (debug) console.log('Focusing search');
        $("#search-input").focus();
        // $(document).scrollTop(0);
    }
  }

};
var h,
Highlight = {

  config: {
    style: window.location.host + 'assets/css/highlight.css',
    custom: null,
    code: $('pre code'),
    theme: $('.hljs-theme'),
    body: $('body')
  },


  init: function() {
    h = this.config;
    this.default()
    this.apply()
  },


  default: function() {
    if (!localStorage.getItem('hljs-theme')) {
       var theme = "dark";
       localStorage.setItem('hljs-theme', theme);
    }
  },


  apply: function() {
    // var h.default = 'assets/css/highlighter.css';
    h.custom   = localStorage.getItem('hljs-theme') || "dark"

    if ((h.custom === "dark") || (h.custom === "light")) {
       if (debug) console.log('Default ' + h.custom + ' theme');
       h.body.removeClass('hljs-dark hljs-light').addClass('hljs-' + h.custom);
       h.theme.attr('href', h.style);
     } else {
       if (debug) console.log('Custom theme from ' + h.custom)
       h.theme.attr('href', h.custom);
     }


     h.code.each(function(i, block) {
       hljs.highlightBlock(block);
     });
  }

};
$(function() {
  
  $('.to-instapaper').click(function(event) {

        event.preventDefault();

        if (debug) console.log("Saving to Instapaper");

        var name = encodeURIComponent(document.title);
        var url = window.location.href;

        window.open("http://www.instapaper.com/hello2?url="+url+"&title="+name);
  });

});
$(function() {

  var searchItems;
  var searchText;

  if(typeof searchBody === 'undefined') {
    var searchBody = $('body').data('search');
  }

$.ajax(searchBody, {
  dataType: "json",
  success: function(contents) {
    searchItems = contents;
  }
}).done(function() {
      // Search parameters?
      if (typeof $.urlParam('s') !== 'undefined') {
        searchText = $.urlParam('s');
        injectFrame("https://duckduckgo.com/?sites=nsis.sourceforge.net&ka=h&k7=%23f5f4f3&kj=%236f6171&ky=%23ffffff&kx=b&kt=Segoe+UI&q="+searchText);
      }

      // Display “Search” and focus
      $("#search-input").attr('placeholder', 'Search').removeAttr('disabled').focus();

      // On search
      $("#search-input").keydown(function () {

        var form = $('#search-form');
        searchText = $("#search-input").val();

        // set focus on item
        $("#search-input>ul>li.ui-state-focus").removeClass("ui-state-focus");
        $('.ui-menu-item').filter(function() { return $.text([this]) === searchText; }).addClass("ui-state-focus");

        if( inArrayS(searchText, searchItems) > -1 ) {
          // redirect to documentation
          form.attr('action', 'javascript:docsPage()');
        } else {
          // search web
          form.attr('action', 'javascript:duckDuckGo()');
        }
      });

      // Prevent empty submission
      $("#search-form").submit(function(e){

        // e.preventDefault();

        if ($.trim( $("#search-input").val() ) === "") {
          return false;
        }
      });

      // Hint search results
      $( "#search-input" ).hint({
        delay: 0,
        source: searchItems
      });

      $('.ui-autocomplete').css({padding: '0'});
  });
});
$(function() {
  Bookmarks.init();
  Modal.init();
  Preferences.init();
  Keyboard.init();
  Highlight.init();
});