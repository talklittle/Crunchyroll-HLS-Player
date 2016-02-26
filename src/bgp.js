chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);
initialize();

var deviceId;
var userData = {};
//var sessionId,auth,authTime,username,password,autoStart,bufferLength,skipOp,skipEd,locale,resume;
function initialize(details){
  chrome.storage.local.get(['userData'],function(items){

    userData['sessionId']=items.userData!==undefined?items.userData['sessionId']:'';
	if(items.userData!==undefined && items.userData['authTime'] !== undefined && items.userData['authTime'] > Date.now()){
	  userData['auth'] = items.userData['auth'];
	  userData['authTime'] = items.userData['authTime'];
	}
	if(items.userData!==undefined && items.userData['username'] !== undefined){
	  userData['username'] = items.userData['username'];
	  userData['password'] = items.userData['password'];
	}
	userData['autoStart'] = items.userData!==undefined?items.userData['autoStart']:'true';
	userData['bufferLength'] = items.userData!==undefined?items.userData['bufferLength']:60;
	userData['skipOp'] = items.userData!==undefined?items.userData['skipOp']:'false';
	userData['skipEd'] = items.userData!==undefined?items.userData['skipEd']:'false';
	userData['locale'] = items.userData!==undefined?items.userData['locale']:'enUS';
	userData['resume'] = items.userData!==undefined?items.userData['resume']:'true';
	userData['deviceId'] = items.userData!==undefined?items.userData['deviceId']:makeid();
	userData['premium'] = items.userData!==undefined?items.userData['premium']:'false';
	chrome.storage.local.set({'userData':userData});
	if(details!==undefined&&details.OnInstalledReason!==undefined){
	  if(details.OnInstalledReason === "update"&&userData['username']!==undefined)
	    login(undefined);
	}
  });
  
}
login(undefined);
var defaultHeaders = [{name:'User-Agent',value:"Mozilla/5.0 (iPhone; iPhone OS 8.3.0; en_US)"}, {name:'Host',value:"api.crunchyroll.com"}, {name:'Accept-Encoding',value:"gzip, deflate"}, {name:'Accept',value:"*/*"}, {name:'Content-Type',value:"application/x-www-form-urlencoded"}];
chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
  return {requestHeaders:defaultHeaders};
},
{urls: ["https://api.crunchyroll.com/*"]},["requestHeaders"]);
chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
  for(var x=0;x<details.requestHeaders.length;x++){
    if(details.requestHeaders[x].name === "Cookie"){
	  details.requestHeaders[x].value = "";
	  return {requestHeaders:details.requestHeaders};
	}
  }
},
{urls: ["http://www.crunchyroll.com/xml/?req=RpcApiVideoPlayer_GetStandardConfig*"],tabId:-1},["requestHeaders","blocking"]);
chrome.webRequest.onBeforeRequest.addListener(function(details){
  return {redirectUrl:chrome.runtime.getURL('VPAIDFlash.swf')};
},
{urls: ["http://www.crunchyroll.com/VPAIDFlash.swf"],tabId:-1},["blocking"]);

function makeid(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 32; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function start(sendResponse){
  var options = {'device_id':userData['deviceId'], 'device_type':"com.crunchyroll.iphone", 'access_token':"QWjz212GspMHH9h", 'version':"2313.8", 'locale': userData['locale']};
  $.ajax('https://api.crunchyroll.com/start_session.0.json',{async:false,data:options,success:function(data){
    userData['sessionId'] = data.data.session_id;
	chrome.storage.local.set({'userData':userData});
    login(sendResponse);
  }});
}
function login(sendResponse){
  if(userData['username'] === undefined){
    if(sendResponse!==undefined)
      sendResponse("badLogin");
	return;
  }
  var loginOptions = {'session_id':userData['sessionId'], 'password':userData['password'], 'account':userData['username'], 'version':"2313.8", 'locale': userData['locale']};
  $.ajax('https://api.crunchyroll.com/login.0.json',{async:false,data:loginOptions,success:function(data){
   userData['auth'] = data.data.auth;
   console.log(data);
   userData['authTime'] = data.data.expires;
   userData['premium'] = data.data.user.premium === "anime|drama|manga"?'true':'false';
   chrome.storage.local.set({'userData':userData});
   $.post('http://www.crunchyroll.com/?a=formhandler',{'formname':'RpcApiUser_ToggleDisplayMature','value':1});
   sendResponse(true);   
  }});
}
function listSeries(){
  var fields = "series.name,series.description,series.series_id,series.rating,series.media_count,series.url,series.publisher_name,series.year,series.portait_image";
  var options ={'media_type':'anime','fields':fields,'limit':'64','offset':0};

}
function getMediaInfo(mediaId,quality,sendResponse,local){
  var fields = "media.episode_number,media.name,media.description,media.url,media.stream_data,media.playhead,media.duration";
  var option = {'session_id':userData['sessionId'], 'version':"2313.8", 'locale': local, 'media_id':mediaId, 'fields':fields};
  $.ajax('https://api.crunchyroll.com/info.0.json',{data:option,success:function(data){
   if(data.error){
     if(data.code === "bad_session"||data.code==="bad_auth_params"){
	   start(sendResponse);
	   getMediaInfo(mediaId,quality,sendResponse,userData['locale']);
	 }else if(data.code==="forbidden"){
	   if(userData['username']!==undefined){
	     getMediaInfo(mediaId,quality,sendResponse,"enUS");
	     alert("Episode not available in selected language, defaulting to English");
	   }
	 }
   }else
     sendResponse({url:data.data.stream_data.streams[quality].url,playhead:data.data.playhead});
  }});  
}
function getAdRoll(mediaId,sendResponse){
  var url = "http://www.crunchyroll.com/xml/?req=RpcApiVideoPlayer_GetStandardConfig&aff=crunchyroll-website&media_id="+mediaId+"&current_page=http://www.crunchyroll.com/"+mediaId;
  var c = 0;
  $.get(url,function(data){
    var streamdata = $('adSlots',data).get(0);
	var parsedData = {};
	var tot = $('adSlot', streamdata).length;
	if(tot===0)
	  sendResponse(parsedData);
	$('adSlot', streamdata).each(function(){
	  var time = $(this).attr('time');
	  if(parsedData[time] === undefined)
	    parsedData[time] = [];
	  $(this).find('vastAd').each(function(){
	    var tempurl = $(this).attr('url');
	    $.get(tempurl,function(data){
		  if($('Ad',data).length>0&&$('MediaFiles',data).length>0){
		    parsedData[time].push(tempurl);
			//chrome.tabs.create({url:tempurl});
		  }
		  if(c>=tot-1){
		    console.log(parsedData);
	        sendResponse(parsedData);
		  }else
		    c++;
		});
	    
	  });
	});
	
  });
}
function getNextMediaId(mediaId,sendResponse){
  var url = "http://www.crunchyroll.com/xml/?req=RpcApiVideoPlayer_GetStandardConfig&media_id="+mediaId+"&current_page=http://www.crunchyroll.com/"+mediaId;
  $.get(url,function(data){
    var temp = $('nextUrl',data).text().split('-');
	sendResponse(temp[temp.length-1]);
  })
}
function updateViewTime(mediaId,playhead){
var data = {'session_id':userData['sessionId'], 'version':"2313.8",'event':'playback_status','playhead':playhead,'media_id':mediaId};
  $.post("https://api.crunchyroll.com/log.0.json",data);
}

function makeAPIRequest(args,method,options){
  
}

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  //console.log('received message');
  if(message.text === "getMediaUrl"){
	getMediaInfo(message.mediaId,message.quality,sendResponse,userData['locale']);
	return true;
  }else if(message.text === "getAdRoll"){
    getAdRoll(message.mediaId,sendResponse);
	return true;
  }else if(message.text === "updatelogin"){
    //console.log(message);
    userData['username'] = message.username;
	userData['password'] = message.password;
	chrome.storage.local.set({'userData':userData});
	login(sendResponse);
	return true;
  }else if(message.text === "getNext"){
    getNextMediaId(message.mediaId,sendResponse);
	return true;
  }else if(message.text === "updateViewTime"){
    updateViewTime(message.mediaId,message.playhead);
  }else if(message.text === "getOptions"){
    sendResponse({'bufferLength':userData['bufferLength'],'skipOp':userData['skipOp'],'skipEd':userData['skipEd'],'locale':userData['locale'],'resume':userData['resume'],'autoStart':userData['autoStart'],'isPremium':userData['premium']});
  }else if(message.text === "updateBufferLength"){
    userData['bufferLength'] = message.bufferLength;
	chrome.storage.local.set({'userData':userData});
	sendResponse(true);
  }else if(message.text === "updateSkipOp"){
    userData['skipOp'] = message.skipOp;
	chrome.storage.local.set({'userData':userData});
  }else if(message.text === "updateSkipEd"){
    userData['skipEd'] = message.skipEd;
	chrome.storage.local.set({'userData':userData});
  }else if(message.text === "updateLocale"){
    userData['locale'] = message.locale;
	chrome.storage.local.set({'userData':userData});
  }else if(message.text === "updateResume"){
    userData['resume'] = message.resume;
	chrome.storage.local.set({'userData':userData});
  }
});