$(document).ready(function(){
	
	$(".tree a").click(function(e){
		e.preventDefault();
		
		$("#main-view").load("/manager/" + $(this).attr("href"));
	});
	
});