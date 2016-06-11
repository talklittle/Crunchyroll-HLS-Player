chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);
initialize();

var deviceId;
var userData = {};
//var sessionId,auth,authTime,username,password,start,bufferLength,skipOp,skipEd,locale,resume;
function initialize(details){
  chrome.storage.local.get(['userData'],function(items){

    userData['sessionId']=(items.userData!==undefined&&items.userData['sessionId']!==undefined)?items.userData['sessionId']:'';
	if(items.userData!==undefined && items.userData['authTime'] !== undefined && items.userData['authTime'] > Date.now()){
	  userData['auth'] = items.userData['auth'];
	  userData['authTime'] = items.userData['authTime'];
	}
	if(items.userData!==undefined && items.userData['username'] !== undefined){
	  userData['username'] = items.userData['username'];
	  userData['password'] = items.userData['password'];
	}
	userData['start'] = (items.userData!==undefined&&items.userData['start']!==undefined)?items.userData['start']:'true';
	userData['bufferLength'] = (items.userData!==undefined&&items.userData['bufferLength']!==undefined)?items.userData['bufferLength']:60;
	userData['skipOp'] = (items.userData!==undefined&&items.userData['skipOp']!==undefined)?items.userData['skipOp']:'false';
	userData['skipEd'] = (items.userData!==undefined&&items.userData['skipEd']!==undefined)?items.userData['skipEd']:'false';
	userData['locale'] = (items.userData!==undefined&&items.userData['locale']!==undefined)?items.userData['locale']:'enUS';
	userData['resume'] = (items.userData!==undefined&&items.userData['resume']!==undefined)?items.userData['resume']:'true';
	userData['autoplay'] = (items.userData!==undefined&&items.userData['autoplay']!==undefined)?items.userData['autoplay']:'true';
	userData['deviceId'] = (items.userData!==undefined&&items.userData['deviceId']!==undefined)?items.userData['deviceId']:makeid();
	userData['premium'] = (items.userData!==undefined&&items.userData['premium']!==undefined)?items.userData['premium']:'false';
	userData['width'] = (items.userData!==undefined&&items.userData['width']!==undefined)?items.userData['width']:960;
	userData['height'] = (items.userData!==undefined&&items.userData['height']!==undefined)?items.userData['height']:570;
	chrome.storage.local.set({'userData':userData});
	if(details!==undefined&&details.OnInstalledReason!==undefined){
	  if(details.OnInstalledReason === "update"&&userData['username']!==undefined)
	    login(undefined,false);
	}
	/*if(userData['sessionId']==='')
	  start(null,false);*/
  });
  
}
//start(null,false);
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

function start(sr,lg,op){

  var options = {'device_id':userData['deviceId'], 'device_type':"com.crunchyroll.iphone", 'access_token':"QWjz212GspMHH9h", 'version':"2313.8", 'locale': userData['locale']};
  //var options = {'device_id':userData['deviceId'], 'device_type':"com.crunchyroll.crunchyroid", 'access_token':"Scwg9PRRZ19iVwD", 'version':"2313.8", 'locale': userData['locale']};
  $.ajax('https://api.crunchyroll.com/start_session.0.json',{async:false,data:options,success:function(data){
    userData['sessionId'] = data.data.session_id;
	chrome.storage.local.set({'userData':userData});
	if(lg)
      login(sr,false);
	if(op)
	  getMediaInfo(op.mediaId,po.quality,op.sendResponse,op.local);
  }});/*
  chrome.cookies.getAll({domain:".crunchyroll.com"},function(cookies){
    for(var x=0;x<cookies.length;x++){
	  if(cookies[x].name === "sess_id")
	    userData['sessionId'] = cookies[x].value;
	  if(cookies[x].name === "c_d")
	    userData['premium'] = cookies[x].value.indexOf('p%3D1')>-1?true:false;
	}
	
  });*/
}
function login(sendResponse,sr){
  if(userData['username'] === undefined){
    if(sendResponse!==undefined)
      sendResponse("badLogin");
	return;
  }
  if(userData['sessionId']===''){
    return start(sendResponse,true,null);
  }
  var loginOptions = {'session_id':userData['sessionId'], 'password':userData['password'], 'account':userData['username'], 'version':"2313.8", 'locale': userData['locale']};
  $.ajax('https://api.crunchyroll.com/login.0.json',{async:false,data:loginOptions,success:function(data){
   userData['auth'] = data.data.auth;
   //console.log(data);
   userData['authTime'] = data.data.expires;
   userData['premium'] = data.data.user.premium === "anime|drama|manga"?'true':'false';
   chrome.storage.local.set({'userData':userData});
   $.post('http://www.crunchyroll.com/?a=formhandler',{'formname':'RpcApiUser_ToggleDisplayMature','value':1});
   if(sr)
     sendResponse(userData['premium']);   
  }});
}
function listSeries(limit,off){
  var fields = "series.name,series.description,series.series_id,series.rating,series.media_count,series.url,series.publisher_name,series.year,series.portait_image";
  var options ={'media_type':'anime','fields':fields,'limit':limit,'offset':off};
  makeAPIRequest('list_series',options);
}
function listCategories(){
  var options = {'media_type':'anime'};
  makeAPIRequest('categories',options);
}
function listCollections(seriesID,limit){
  var fields = "collection.collection_id,collection.season,collection.name,collection.description,collection.complete,collection.media_count";
  var options = {'series_id': seriesID,'fields': fields,'sort':'desc','limit':limit};
  makeAPIRequest('list_collections',options);
}
function listMedia(collectionId){
  var fields = "media.episode_number,media.name,media.description,media.media_type,media.series_name,media.available,media.available_time,media.free_available,media.free_available_time,media.playhead,media.duration,media.url,media.screenshot_image,image.fwide_url,image.fwidestar_url,series.landscape_image,image.full_url,media.stream_data";
  var options = {'collection_id': collectionId,
               'fields':        fields,
               'sort':          'desc',
               'limit':         '256'};
  makeAPIRequest('list_media',options);
}
function makeAPIRequest(method,options){
   var url = 'https://api.crunchyroll.com/'+method+'.0.json';
   var dat = {'session_id':userData['sessionId'], 'version':"2313.8", 'locale': userData['locale']};
   for(var a in options){dat[a] = options[a]}
   $.ajax(url,{data:dat,success(data){
     console.log(data);
   }});
}
function getMediaInfo(mediaId,quality,sendResponse,local){
  var fields = "media.episode_number,media.name,media.description,media.url,media.stream_data,media.playhead,media.duration";
  var option = {'session_id':userData['sessionId'], 'version':"2313.8", 'locale': local, 'media_id':mediaId, 'fields':fields};
  $.ajax('https://api.crunchyroll.com/info.0.json',{data:option,success:function(data){
   if(data.error){
     if(data.code === "bad_session"||data.code==="bad_auth_params"){
	   start(sendResponse,true,null);
	   getMediaInfo(mediaId,quality,sendResponse,userData['locale']);
	 }else if(data.code==="forbidden"){
	   if(userData['username']!==undefined){
	     getMediaInfo(mediaId,quality,sendResponse,"enUS");
	     alert("Episode not available in selected language, defaulting to English");
	   }
	 }
   }else{
     if(data.data.stream_data===null){
	   start(sendResponse,true,{mediaId,quality,sendResponse,local})
	   
	 }
     sendResponse({url:data.data.stream_data.streams[quality].url,playhead:data.data.playhead});
  }}});  
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
		    //console.log(parsedData);
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
    var temp = $('nextUrl',data).text();
	sendResponse(temp);
  })
}
function updateViewTime(mediaId,playhead){
var data = {'session_id':userData['sessionId'], 'version':"2313.8",'event':'playback_status','playhead':playhead,'media_id':mediaId};
  $.post("https://api.crunchyroll.com/log.0.json",data);
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
	login(sendResponse,true);
	return true;
  }else if(message.text === "getNext"){
    getNextMediaId(message.mediaId,sendResponse);
	return true;
  }else if(message.text === "updateViewTime"){
    updateViewTime(message.mediaId,message.playhead);
  }else if(message.text === "getOptions"){
    sendResponse({'bufferLength':userData['bufferLength'],'skipOp':userData['skipOp'],'skipEd':userData['skipEd'],'locale':userData['locale'],'resume':userData['resume'],'start':userData['start'],'isPremium':userData['premium'],'autoplay':userData['autoplay'],width:userData['width'],height:userData['height']});
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
  }else if(message.text === "updateStart"){
    userData['start'] = message.start;
	chrome.storage.local.set({'userData':userData});
  }else if(message.text === "updateAutoplay"){
    userData['autoplay'] = message.autoplay;
	chrome.storage.local.set({'userData':userData});
  }else if(message.text === "updateWidth"){
    userData['width'] = message.width;
	chrome.storage.local.set({'userData':userData});
  }else if(message.text === "updateHeight"){
    userData['height'] = message.height;
	chrome.storage.local.set({'userData':userData});
  }
});