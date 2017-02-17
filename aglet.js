// TODO: An Aglet type of array with only one value may be necessary to specify.
// NOTE: This would only be necessary for a situation where the object is being parsed,
// but only has a single child element.
var Aglet = function (element){
	//Config
	var AG_NAME = 'ag-name';

	function Aglet (element) {

		this.dom = element;
		this.dom.aglet = this;

		this.name = 'none';
	 	if (element.getAttribute(AG_NAME)) {
			this.name = element.getAttribute(AG_NAME);
		} else if (element.id) {
			this.name = element.id;
		}

		var children = [];
		if (element.children.length) {
			for (var i=0; i<element.children.length; i++) {
				children.push(new Aglet(element.children[i]));
			}
		}

		for (var i in children) {
			var child = children[i];

			// We don't want to save this in the hierarchy, so we need to copy
			// the existing aglets and attach them to the next parent. This is
			// pretty inefficient since we are running the attachment method
			// for every parent even if we don't keep it, but there's no reference
			// otherwise.
			// TODO: Solve that inefficiency. (It's really not that intensive.)
			if (child.name == 'none') {
				delete child.name;
				delete child.dom;
				for (var key in child) {
					if (typeof child[key] == 'function') {
						continue;
					}
					child[key].name = key;
					this.attachAglet(child[key]);
				}
				delete child;
				continue;
			}
			this.attachAglet(child);
		}
		delete children;
	}

	Aglet.prototype.createElement = function (tag, name, options) {
		var element = document.createElement(tag);
		element.setAttribute(AG_NAME, name);
		for (var option in options) {
			element[option] = options[option];
		}
		
		this.attachElement(element, null, true);
	}
	Aglet.prototype.attachElement = function (element, name, move) {
		if (name) {
			element.setAttribute(AG_NAME, name);
		}

		var newAg = new Aglet(element);

		if (move)
			this.dom.appendChild(newAg.dom);

		return this.attachAglet(newAg);
	}
	Aglet.prototype.attachAglet = function (ag) {

		var name = ag.name;

		if (typeof this[name] == 'undefined') {	
			this[name] = ag;
		} else if (Array.isArray(this[name])) {
			this[name].push(ag);
		} else {
			// TODO: Possibly extend an Aglet onto the Array object.
			this[name] = [this[name], ag];
			this[name].parent = this;
			this[name].name = name;
		}

		ag.parent = this;

		return ag;
	}
	Aglet.prototype.attachComponent = function (comp) {
		var copy = comp.dom.cloneNode(1);
		return this.attachElement(copy, comp.name, true);
	}
	// TODO: pick a less stupid name for this.
	Aglet.prototype.removeAglet = function (child) {
		if (!child) {
			child = this;
		}

		if (Array.isArray(child)) {
			for (var i=child.length-1; i>=0; i--) {
				child[i].removeAglet();
			}
			delete child.parent[child.name];
			return;
		}

		child.dom.parentNode.removeChild(child.dom);

		if (Array.isArray(child.parent[child.name])) {
			for (var i in child.parent[child.name]) {
				if (child.parent[child.name][i] == child) {
					child.parent[child.name].splice(i,1);
					return;
				}
			}
		}
		delete child.parent[child.name];
	}

	Aglet.prototype.hide = function () {
		this.ag_current_display = (this.dom.style.display) ? this.dom.style.display : 'block';
		this.dom.style.display = 'none';
	}
	Aglet.prototype.show = function () {
		this.dom.style.display = (this.ag_current_display) ? this.ag_current_display : 'block';
	}
	Aglet.prototype.setHTML = function (html) {
		this.dom.innerHTML = html;
	}
	Aglet.prototype.setStyle = function (style) {
		this.dom.setAttribute('style', style);
	}
	Aglet.prototype.$ = function () {
		return jQuery(this.dom);
	}

	return new Aglet(element);
};

Aglet.loadComponents = function (url, callback) {
	if (typeof url != 'string') {
		this.components = new Aglet(url);
		return;
	}
	var _self = this;
	var r = new XMLHttpRequest();
	r.open('GET', url);
	r.send();

	r.onload = function(e) {
		var placeholder = document.createElement('div');
		placeholder.innerHTML = r.response;
		document.body.appendChild(placeholder);

		_self.components = new Aglet(placeholder);
		placeholder.parentNode.removeChild(placeholder);
		callback();
	}
}
