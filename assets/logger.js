$(document).ajaxSuccess(function(event, xhr, options, data){
	if(options.url.match(/wm_logs/)) return false;
	
	$.ajax({
		url: config.api_logs + "/set",
		type: "POST",
		headers: {
			"Authorization": "Bearer " + localStorage.getItem("user_token")
		},
		data: {
			"user-token": localStorage.getItem("user_token"),
			"operation": "test",
			"duration": "0.435"
		},
		success: function(result){
			console.log(result);
		}
	});
});