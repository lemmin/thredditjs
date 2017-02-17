window.onload = function () {
	T.time("Setup");
	T.time("Setup: Local");
	var page = Aglet(document.body);
	window.threadlist = page.threadlist;
	window.messaging = page.messaging;
	threadlist.POSTMAX = 150;
	threadlist.COMMENTMAX = 10000;
	threadlist.attachAglet(page.loading);
	T.timeEnd("Setup: Local");

	T.time("Setup: Components (XHR)");
	Aglet.loadComponents('components.html', function (){
		threadlist.threaditID = '';

		navigate();
		T.timeEnd("Setup: Components (XHR)");
		T.timeEnd("Setup");
	});
	


	threadlist.getThreads = function (id) {
		threadlist.showLoading();
		if (id) {
			var url = 'http://api.threaditjs.com/comments/' + id;
			var max = threadlist.COMMENTMAX;
		}
		else {
			var url = 'http://api.threaditjs.com/threads';
			var max = threadlist.POSTMAX;
		}

		getJSON(url, function (data) {
			threadlist.hideLoading();
			if (data.error == 'insufficient success') {
				messaging.display('Something went wrong. Try again.', 'error');
				return;
			}
			if (data.data == 'not found') {
				messaging.display('Thread no longer exists. Try another one (from the homepage, probably).', 'error');
				return;
			}
			threadlist.attachPosts(data.data, threadlist, max);
			threadlist.attachForm(threadlist);
		});
	}

	threadlist.formHandler = function (form, parent) {
		if (form.hidParent.dom.value)
			var url = 'http://api.threaditjs.com/comments/create';
		else
			var url = 'http://api.threaditjs.com/threads/create';

		postJSON(url, {parent: form.hidParent.dom.value, text: form.inText.dom.value}, function (data) {
			threadlist.buildPost(data.data.text, data.data.id, data.data.comment_count, parent, threadlist.COMMENTMAX);
			form.removeAglet();
			parent.btnReply.show();
			parent.commentCount.setCount(parent.commentCount.n+1);
		});
	}

	threadlist.attachForm = function (parent) {
		var form = parent.attachComponent(Aglet.components.frmPost);
		form.hidParent.dom.value = parent.threaditID;
		form.btnSubmit.dom.onclick = function (e) {
			threadlist.formHandler(form, parent);
			e.preventDefault();
			return false;
		}
		if (parent.commentCount)
			parent.dom.insertBefore(form.dom, parent.commentCount.dom);
		return form;
	}

	threadlist.attachPosts = function (data, parent, max) {

		function attachPosts (data, parent) {
			if (!data)
				return;

			for (var id in data) {
				var entry = data[id];

				if (!entry || entry.processed)
					continue;

				var post = threadlist.buildPost(entry.text, id, entry.comment_count, parent, max);
				entry.processed = true;

				var entries = {};
				if (entry.children) {
					attachPosts(entry.children, post);
				}
			}
		}

		threadlist.scrollTo(parent);
		//TODO: agletjs doesn't seem to be removing the posts correctly.
		//revisit removeAglet logic.
		//parent.dom.innerHTML = '';
		console.log('post',parent.post);

		if (parent.post)
			parent.removeAglet(parent.post);
		if (parent.frmPost)
			parent.frmPost.removeAglet();

		console.log('post2',parent.post);

		var entries = {};
		for (var i in data) {
			entries[data[i].id] = data[i];
		}
		
		for (var i in entries) {
			var children = {};
			if (entries[i].children.length) {
				for (var j=0; j<entries[i].children.length; j++) {
					children[entries[i].children[j]] = entries[entries[i].children[j]];
				}
				entries[i].children = children;
			}
		}
		T.time("Thread render");
		attachPosts(entries, parent);
		T.timeEnd("Thread render");
	}

	threadlist.buildPost = function (text, id, comment_count, parent, max) {
		var post = parent.attachComponent(Aglet.components.post);
		post.title.dom.innerHTML = text.substr(0,max);
		post.title.dom.href = '#' + id;
		post.commentCount.setCount = function (n) {
			this.dom.innerHTML = n + ' Comment' + (n-1 ? 's' : '');
			this.n = n;
		};
		post.commentCount.setCount(comment_count);
		post.threaditID = id;
		post.btnReply.dom.onclick = function () {
			threadlist.attachForm(post);
			this.aglet.hide();
		}
		return post;
	}

	threadlist.showLoading = function () {
		threadlist.loading.show();
	}
	threadlist.hideLoading = function () {
		threadlist.loading.hide();
	}

	threadlist.scrollTo = function (ele) {
		var offset = ele.dom.getBoundingClientRect().top + 'px';
		document.body.scrollTop = offset;
		document.documentElement.scrollTop = offset;
	}

	messaging.display = function (message, type) {
		messaging.dom.className = type;
		messaging.dom.innerHTML = message;
		messaging.show();
	}
	messaging.clear = function () {
		messaging.dom.innerHTML = '';
		messaging.hide();
	}
}


// XHR
function getJSON (url, callback) {
	var r = new XMLHttpRequest();
	r.open('GET', url);
	r.send();

	r.onload = function () {
		callback(JSON.parse(this.responseText));
	}
	r.onerror = navigate;
}

function postJSON (url, data, callback) {
	var r = new XMLHttpRequest();
	r.open('POST', url);
	r.setRequestHeader("Content-type", "application/json");
	r.send(JSON.stringify(data));

	r.onload = function () {
		callback(JSON.parse(this.responseText));
	}
	r.onerror = navigate;
}


// Routing
window.onpopstate = function (e) {
	messaging.clear();
	var url = window.location.toString();

	if (url.substr(-1) == '#')
		var newurl = url.replace(/\/[^\/]+$/, '') + '/';
	else
		var newurl = window.location.hash.replace('#', '')

	history.replaceState(null, null, newurl);

	navigate();
}

function navigate() {
	var id = parseURL();
	threadlist.getThreads(id);
}
function parseURL() {
	var id = window.location.hash.substr(1);
	if (id)
		return id;

	var m = window.location.toString().match(/\/([^\/]+)$/);
	if (m && m[1])
		return m[1];
	return '';
}