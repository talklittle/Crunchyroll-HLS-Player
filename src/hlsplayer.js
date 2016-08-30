var timerinterval;
var quality;
var loginCont = $('<div  id="loginCont"style="background-color:rgba(120,120,120,0.7);width:100%;height:100%;z-index:1000;position:fixed;top:0px;left:0px;display:none;"><div style="width:180px;height:110px;background-color:white;padding:5px;box-shadow:2px 2px 2px #888888;text-align:center;position:fixed;top:calc(50% - 55px);left:calc(50% - 90px);z-index:1001;"><span>Please enter your login info</span><input type="text" placeholder="Username"id="username"style="display:block;margin:5px;"><input type="password"placeholder="password"id="password" style="display:block;margin:5px;"><input type="button"id="loginSubmit"value="Login" style="display:block;margin:auto;"></div></div>');
var opEnd,edStart,ctime=0;
var skipOp =false,skipEd = false,resume =true,autoStart = true,adsEnabled=true,isPremium = false,autoPlay = true,width = 960,height = 570;
var player,vastAd;
var rplayhead=0;
var mediaId;
var adDone=false;
$(function(){  
  chrome.runtime.sendMessage({text:"getOptions"},function(reply){
    videojs.Hls.GOAL_BUFFER_LENGTH = parseInt(reply.bufferLength);
	skipOp = reply.skipOp;
	skipEd = reply.skipEd;
	resume = reply.resume;
	autoStart = reply.start;
	isPremium = reply.isPremium;
	autoPlay = reply.autoplay;
	adsEnabled = isPremium === "true"?false:true;
	//adsEnabled = false;
    width = reply.width;
	height = reply.height;
  $('#showmedia_video_box_wide').remove();
  if($('#showmedia_video_box').length>0){
    $('#showmedia_video_box').remove();
    var lowerDiv = $('<div id="lower">');
    $('#showmedia').addClass('new_layout_wide');
    $('#main_content').css({'width':'100%'});  
	$('#sidebar script').remove();
    $('#main_content').append($('#sidebar').remove());
    $('#main_content #sidebar .landscape-element').css({'width':'296px','background':'none'});
    $('#main_content').append(lowerDiv);
    $(lowerDiv).css({'width':'640px'});	
  }
  $('#showmedia_video').prepend('<video id="video" controls class="video-js vjs-default-skin" width="'+width+'" height="'+height+'"></video>');
  
  $('body').append(loginCont);
  $('#loginSubmit').click(function(){
    $('#loginCont').hide();
    chrome.runtime.sendMessage({text:"updatelogin",username:$('#username').val(),password:$('#password').val()},function(reply){
	  $('#username').val('')
	  $('#password').val('')
	  if(reply === 'true'){
	    adsEnabled = false;
		isPremium = true;
	  }
	  play(mediaId,quality);
	});	
  });
  switch($('div.video-quality div.showmedia-btns a.dark-button').text()){
    case "SD":
	  quality = 1;
	  break;
	case "480P":
	  quality = 2;
	  break;
	case "720P":
	  quality = 3;
	  break;
	case "1080P":
	  quality = 4;
	  break;
	default:
	  quality = 0;
	  break;
  }
  var bufferLengths = [0,1500,900,600,450];
  videojs.Hls.GOAL_BUFFER_LENGTH = Math.min(videojs.Hls.GOAL_BUFFER_LENGTH,bufferLengths[quality]);
  var temp = location.pathname.split('-');
  mediaId = temp[temp.length-1];
  play(mediaId,quality);

  
  if($('#lower').length>0){
    rearrangeshit();
  }
  });
});
function rearrangeshit(){
  $('div.guestbook.comments.box script,div.showmedia-submenu script,#main_content>div.white-wrapper.container-shadow.large-margin-bottom script').remove();
  $('#lower').append($('div.showmedia-submenu').detach());
  $('#lower').append($('#main_content>div.white-wrapper.container-shadow.large-margin-bottom').detach());
  $('#lower').append($('div.guestbook.comments.box').detach());
}


function play(mediaId,quality){
  chrome.runtime.sendMessage({text:"getAdRoll",mediaId:mediaId},function(reply){
    //console.log(reply);
    adUrls = reply;
	if(Object.keys(adUrls).length == 0){
	  adsEnabled = false;
	}
	else if(adUrls&&Object.keys(adUrls)[1]&&Object.keys(adUrls)[3]){
	  opEnd = parseInt(Object.keys(adUrls)[1]);
	  edStart = parseInt(Object.keys(adUrls)[3]);
	}
	getMediaInfo(mediaId,quality);
  });
}
function getMediaInfo(mediaId,quality){
  chrome.runtime.sendMessage({text:"getMediaUrl",mediaId:mediaId,quality:quality},function(reply){
    if(reply === "badLogin"){
	  $('#loginCont').show();
	  return;
	}
    rplayhead=reply.playhead;
	videojs.plugin('ads-setup', function (opts) {
      var player = this;
      var adsCancelTimeout = 3000;

      vastAd = player.vastClient({
        //Media tag URL
        adTagUrl: getAdsUrl,
        //Note: As requested we set the preroll timeout at the same place than the adsCancelTimeout
        adCancelTimeout: adsCancelTimeout,
        adsEnabled: !!adsEnabled
      });
	  if(adsEnabled)
	    vastAd.enable();
	  
    });
	player = videojs('video',{"plugins":{"ads-setup":{"adCancelTimeout":20000,"adsEnabled":adsEnabled}}},function(){this.seek({'seek_param':'t'})});
	
	if(width != 960){
	var targetFloat = (width-960)/2
	targetFloat.toPrecision(1);
	$('#video').css('right',targetFloat.toString()+'px');
	}
	player.src({type:'application/x-mpegURL',src:reply.url});
	//player.ads();
	player.persistvolume({namespace:'crunchyroll'});
	player.preload(true);
	player.cuepoints();
	if(!isNaN(opEnd)){
	player.addCuepoint({
	  namespace: "Opening",
	  start: opEnd-89,
	  end: edStart,
	  onStart: function(params){
	    //console.log("Near start of op");
		if(skipOp==="true"&&isNaN(opEnd)===false&&adDone){
	      player.currentTime(opEnd);
		  player.destroyCuepoints() 
		}
	  },
	  onEnd: function(params){
	    //console.log("Start of ED");
		if(skipEd==="true"&&isNaN(edStart)===false&&adDone){
	      player.currentTime(edStart+89);
		  player.destroyCuepoints()
		}
	  },
	  params:{error:false}
	});}  
    if(resume === "true"){
	  player.one('playing',function(){
	    if(adsEnabled){player.one('playing',function(){return this.currentTime(rplayhead);})}
		else{
	      console.log('first attempt go');
		  adDone=true;
	      return this.currentTime(rplayhead);
		}
	  });
	}	
    if(autoStart === "true")
	    player.play();
    player.on('vast.adError',function(e){
		adsEnabled = false;
		//player.trigger('playing');
	});
    player.hotkeys({alwaysCaptureHotkeys:true});
	ccount = 0;
	updateViewTime(mediaId,player.currentTime())
	timerinterval = player.setInterval(function(){if(!player.paused()||player.currentTime()!==ctime)updateViewTime(mediaId,player.currentTime())},30000);
	player.one("ended",function(){
	  if(adsEnabled){
	    adDone=true;
	    player.one("ended",playNextVideo);
	  }else
	    playNextVideo();
	});
	
  });
}
function playNextVideo(){
  player.clearInterval(timerinterval);
  updateViewTime(mediaId,player.currentTime()-1);
  if(autoPlay === "true"){
    chrome.runtime.sendMessage({text:'getNext',mediaId:mediaId},function(reply){
	  console.log(reply);
	  window.history.pushState(null,null,reply);
	  reply = reply.split('-');
	  mediaId  = reply[reply.length-1];
      play(mediaId,quality);
    });
  }
}
function updateViewTime(mediaId,playhead){
  ctime=playhead;
  chrome.runtime.sendMessage({text:"updateViewTime",playhead:playhead,mediaId:mediaId});
}

function getAdsUrl(){
  var n = Object.keys(adUrls);
  for(var x=0;x<n.length;x++){
    if(adUrls[n[x]].length>0){
	  return adUrls[n[x]].splice(0)[0];
	}
  }    
}
