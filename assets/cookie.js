function getCookie(name, json = false){
	if(!name){
		return undefined;
	}
	
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + "=([^;]*)"
	));
	if(matches){
		let res = decodeURIComponent(matches[1]);
		if(json){
			try{
				return JSON.parse(res);
			} catch(e){
			}
		}
		return res;
	}
	
	return undefined;
}

function setCookie(name, value, options = {}){
	if(!name){
		return;
	}
	
	options.path = "/";
	
	if(options.expires instanceof Date){
		options.expires = options.expires.toUTCString();
	}
	
	if(value instanceof Object){
		value = JSON.stringify(value);
	}
	let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);
	for(let optionKey in options){
		updatedCookie += "; " + optionKey;
		let optionValue = options[optionKey];
		if(optionValue !== true){
			updatedCookie += "=" + optionValue;
		}
	}
	document.cookie = updatedCookie;
}

function deleteCookie(name){
	setCookie(name, null, {
		expires: new Date(),
		path: '/'
	})
}