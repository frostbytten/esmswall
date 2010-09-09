// The idea is to have one high level
// Nitrogen object, created from NitrogenClass, that 
// encapsulates everything in order to prevent collisions.

function NitrogenClass(o) {
    this.$url = document.location.href;
    this.$div = document;
    this.$params = new Object();
    this.$event_queue = new Array();
    this.$event_is_running = false;
    this.$system_event_queue = new Array();
    this.$system_event_is_running = false;
    return this;
}

/*** PRIVATE METHODS ***/

NitrogenClass.prototype.$anchor = function(anchor, target) {
    this.$anchor_path = anchor;
    this.$target_path = target;
}

NitrogenClass.prototype.$set_param = function(key, value) {
    this.$params[key] = value;
}

/*** EVENT QUEUE ***/

NitrogenClass.prototype.$queue_event = function(validationGroup, eventContext, extraParam) {
    // Put an event on the event_queue.
    this.$event_queue.push({
		               validationGroup : validationGroup,
		               eventContext    : eventContext,
		               extraParam      : extraParam
	                   });
}

NitrogenClass.prototype.$queue_system_event = function(eventContext) {
    // Put an event on the event_queue.
    this.$system_event_queue.push({
		                      eventContext : eventContext
	                          });
}

NitrogenClass.prototype.$event_loop = function() {
    // If no events are running and an event is queued, then fire it.
    if (!this.$system_event_is_running && this.$system_event_queue.length > 0) {
        var o = this.$system_event_queue.shift();
        this.$do_system_event(o.eventContext);
    }

    // If no events are running and an event is queued, then fire it.
    if (!this.$event_is_running && this.$event_queue.length > 0) {
        var o = this.$event_queue.shift();
        this.$do_event(o.validationGroup, o.eventContext, o.extraParam);
    }

    // No more events, sleep for 50 ms...
    if (this.$system_event_queue.length == 0 || this.$event_queue.length == 0) {
        setTimeout("Nitrogen.$event_loop();", 50);
        return;
    }

    // Events queued, but one is running, sleep for 10 ms...
    if (this.$event_is_running || this.$system_event_is_running) {
        setTimeout("Nitrogen.$event_loop();", 10);
        return;
    }

    // Events queued, loop and grab it...
    setTimeout("Nitrogen.$event_loop();", 1);
}

/*** VALIDATE AND SERIALIZE ***/

NitrogenClass.prototype.$validate_and_serialize = function(validationGroup) {
    // Check validatation, build list of params...
    var is_valid = true;
    var elements = jQuery(":input").not(".no_postback").get();
    var params=new Array();

    for (var i=0; i<elements.length; i++) {
	var element = elements[i];
	if (element.validator && (element.validator.group == validationGroup) && !element.validator.validate()) {
	    // Set a flag, but keep validating to show all messages.
	    is_valid = false;
	} else {
	    // Skip any unchecked radio boxes.
	    if (element.type == "radio" && !element.checked) continue;

	    var full_id = this.$make_id(element);
	    var value = element.value;
	    params.push(full_id + "=" + encodeURIComponent(value));
	}
    }
    
    // Return the params if valid. Otherwise, return null.
    if (is_valid) {
	return params.join("&");
    } else {
	return null;
    }
}

NitrogenClass.prototype.$make_id = function(element) {
    var a = [];
    var re = new RegExp("\.wfid_(.[^\\s]*)", "g");
    while(element && element.className) {
        var matches = element.className.match(/wfid_([^\s])+/g);
        if (matches) {
            a.unshift.apply(a, matches);
        }       
        element = element.parentNode;
    }  
    return a.join(".");
}


/*** AJAX METHODS ***/

NitrogenClass.prototype.$do_event = function(validationGroup, eventContext, extraParam) {
    // Flag to prevent firing multiple postbacks at the same time...
    this.$event_is_running = true;

    // Run validation...
    var s = this.$validate_and_serialize(validationGroup);	
    if (s == null) {
	this.$event_is_running = false;
	return;
    }
    
    // Assemble other parameters... 
    var params = "";
    params += "eventContext=" + eventContext + "&";
    params += extraParam + "&";
    params += s + "&";
    for (var key in this.$params) {
	params += key + "=" + this.$params[key] + "&";
    }
    
    var n = this;

    jQuery.ajax({ 
		    url: this.$url,
		    type:'post',
		    data: params,
		    dataType: 'text',
		    success: function(data, textStatus) {
			n.$event_is_running = false;
			eval(data);
		    },
		    error: function(xmlHttpRequest, textStatus, errorThrown) {
			n.$event_is_running = false;
		    }
	        });			
}

/*** SYSTEM EVENTS (FOR ASYNC) ***/

NitrogenClass.prototype.$do_system_event = function(eventContext) { 
    // Flag to prevent firing multiple postbacks at the same time...
    this.$system_event_is_running = true;

    // Assemble parameters... 
    var params = "";
    params += "eventContext=" + eventContext + "&";
    for (var key in this.$params) {
	params += key + "=" + this.$params[key] + "&";
    }
    params += "is_system_event=1"

    var n = this;

    $.ajax({ 
	       url: this.$url,
	       type:'post',
	       data: params,
	       dataType: 'text',
	       success: function(data, textStatus) {
		   n.$system_event_is_running = false;
		   // A system event shouldn't clobber the pageContext.
		   // Easiest to cacount for it here.
                   var pc = n.$params["pageContext"];
		   eval(data);
                   n.$set_param("pageContext", pc);
	       },
	       error: function(xmlHttpRequest, textStatus, errorThrown) {
		   n.$system_event_is_running = false;
	       }
	   });                     
}

/*** FILE UPLOAD ***/
NitrogenClass.prototype.$upload = function(form) {
    // Assemble other parameters...
    form.action = this.$url;
    form.pageContext.value = this.$params["pageContext"];
    form.submit();
    form.reset();
}

/*** PATH LOOKUPS ***/

function obj(path, anchor) {
    return objs(path, anchor).get(0);
}

function objs(path, anchor) {
    // Trim the path...
    path = jQuery.trim(path);

    // If no anchor is specified, then use the last anchor set...
    if (!anchor) {
        anchor = Nitrogen.$anchor_path;
    }

    // Multiple parts, so split and combine results...
    if (path.indexOf(",") != -1) {
        var paths=path.split(",");
        var a = $();
        for (var i=0; i<paths.length; i++) {
            a = a.add(objs(paths[i], anchor));
        }
        return a;
    }

    // Selector is "page", so return the document...
    if (path == "page" || path == ".page") {
	return jQuery(document);
    }

    // Replace "##" with ".wfid_"...
    path = path.replace(/##/g, '.wfid_');

    // Replace "me" with anchor...
    path = path.replace(/\bme\b/g, anchor);

    // If this is a single word, then rewrite it to a Nitrogen element id.
    if (path.indexOf(" ") == -1 && path.indexOf(".") == -1) {
        var results = objs(".wfid_" + path, anchor);
        
        // If we found results, then return them...
        if (results.length > 0) {
            return results;
        }

        // If no results, and this is not a valid HTML element name, then return. Otherwise,
        // keep trying with the assumption that this is an HTML element...
        if (results.length == 0 && jQuery.inArray(path.toLowerCase(), Nitrogen.$valid_elements) == -1) {
            return jQuery();
        }
    }

    // If path begins with "body", then try matching across the entire
    // body...
    var re = new RegExp(/^body\b/);
    if (re.test(path)) {
        return jQuery(path);
    }    

    // Find all results under the anchor...
    var results = jQuery(anchor).find(path);
    if (results.length > 0) {
	return results;
    }
    
    // If no results under the anchor, then try on each parent, moving upwards...
    var results = jQuery(anchor).parents();
    for (var i=0; i<results.length; i++) {
	var results2 = jQuery(results.get(i)).find(path);
	if (results2.length > 0) {
	    return results2;
	}		
    }

    // No results, so try in context of entire page.
    return jQuery(path);
}

NitrogenClass.prototype.$valid_elements = [
    "a", "abbr", "acronym", "address", "applet", "area", "b", "base", "basefont", 
    "bdo", "big", "blockquote", "body", "br", "button", "caption", "center", "cite", 
    "code", "col", "colgroup", "dd", "del", "dfn", "dir", "div", "dl", "dt", "em", 
    "fieldset", "font", "form", "frame", "frameset", "h1", "h2", "h3", "h4", 
    "h5", "h6", "head", "hr", "html", "i", "iframe", "img", "input", "ins", "isindex", 
    "kbd", "label", "legend", "li", "link", "map", "menu", "meta", "noframes", "noscript", 
    "object", "ol", "optgroup", "option", "p", "param", "pre", "q", "s", "samp", "script", "select", 
    "small", "span", "strike", "strong", "style", "sub", "sup", "table", "tbody", "td", "textarea", 
    "tfoot", "th", "thead", "title", "tr", "tt", "u", "ul", "var"
];


/*** EVENT WIRING ***/

NitrogenClass.prototype.$observe_event = function(anchor, path, type, func) {
    objs(path, anchor).bind(type, func);
}

/*** DYNAMIC UPDATING ***/

NitrogenClass.prototype.$update = function(anchor, path, html) {
    objs(path, anchor).html(html);
}

NitrogenClass.prototype.$replace = function(anchor, path, html) {
    objs(path, anchor).replaceWith(html);
}

NitrogenClass.prototype.$insert_top = function(anchor, path, html) {
    objs(path, anchor).prepend(html);
}

NitrogenClass.prototype.$insert_bottom = function(anchor, path, html) {
    objs(path, anchor).append(html);
}

NitrogenClass.prototype.$remove = function(anchor, path) {
    objs(path, anchor).remove();
}


/*** MISC ***/

NitrogenClass.prototype.$return_false = function(value, args) { 
    return false; 
}

NitrogenClass.prototype.$is_key_code = function(event, keyCode) {
    return (event && event.keyCode == keyCode);
}

NitrogenClass.prototype.$go_next = function(controlID) {
    var o = obj(controlID);
    if (o.focus) o.focus();
    if (o.select) o.select();
    if (o.click) o.click();
}

NitrogenClass.prototype.$disable_selection = function(element) {
    element.onselectstart = function() {
	return false;
    };
    element.unselectable = "on";
    element.style.MozUserSelect = "none";
    element.style.cursor = "default";
}

NitrogenClass.prototype.$set_value = function(anchor, element, value) {
    if (!element.id) element = objs(element);
    element.each(function(index, el) {
                     if (el.value != undefined) el.value = value;
                     else if (el.checked != undefined) el.checked = value;
                     else $(el).html(value);
                 });
}

NitrogenClass.prototype.$normalize_param = function(key, value) {
    // Create the key=value line to add.
    // Sometimes, the user will pass a bunch of params in the key field.
    var s = "";
    if (key) { s = key; }
    if (key && value) { s = key + "=" + value; }
    return key + "&" + value;
}

NitrogenClass.prototype.$encode_arguments_object = function(Obj) {
    if (! Bert) { alert("Bert.js library not included in template.") }
    var a = new Array();
    for (var i=0; i<Obj.length; i++) {
	a.push(Obj[i]);
    }
    var s = Bert.encode(a);
    return "args=" + this.$urlencode(s);
}

NitrogenClass.prototype.$urlencode = function(str) {
    return escape(str).replace(/\+/g,'%2B').replace(/%20/g, '+').replace(/\*/g, '%2A').replace(/\//g, '%2F').replace(/@/g, '%40');
}

/*** DATE PICKER ***/

NitrogenClass.prototype.$datepicker = function(pickerObj, pickerOptions) {
    jQuery(pickerObj).datepicker(pickerOptions);
}


/*** DRAG AND DROP ***/

NitrogenClass.prototype.$draggable = function(path, dragOptions, dragTag) {
    objs(path).each(function(index, el) {
		        el.$drag_tag = dragTag;
		        jQuery(el).draggable(dragOptions);
	            });
}

NitrogenClass.prototype.$droppable = function(path, dropOptions, dropPostbackInfo) {
    var n = this;
    dropOptions.drop = function(ev, ui) {
	var dragItem = ui.draggable[0].$drag_tag;
	n.$queue_event(null, dropPostbackInfo, "drag_item=" + dragItem);
    };
    objs(path).each(function(index, el) {
		        jQuery(el).droppable(dropOptions);
	            });
}



/*** SORTING ***/

NitrogenClass.prototype.$sortitem = function(el, sortTag) {
    var sortItem = obj(el);
    sortItem.$sort_tag = sortTag;
    sortItem.$drag_tag = sortTag;
}

NitrogenClass.prototype.$sortblock = function(el, sortOptions, sortPostbackInfo) {
    var n = this;
    sortOptions.update = function() {
	var sortItems = "";
	for (var i=0; i<this.childNodes.length; i++) {
	    var childNode = this.childNodes[i];
	    if (sortItems != "") sortItems += ",";
	    if (childNode.$sort_tag) sortItems += childNode.$sort_tag;
	}
	n.$queue_event(null, sortPostbackInfo, "sort_items=" + sortItems);
    };
    objs(el).sortable(sortOptions);
}

var Nitrogen = new NitrogenClass();
var page = document;
Nitrogen.$event_loop();