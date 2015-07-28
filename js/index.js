'use strict'

var file= $('#file');
var blob = null;
var button = $('#button');
var algorithm = $('#algorithm');
var n = $('#n');//分成几类

var canvasOrigin = $('#canvasOrigin');
var canvas = $('#canvas');
var context = canvas.get(0).getContext("2d");
var img = $('#img');
var imgH = 0;
var imgW = 0;

button.click(function(e) {
  var algo = algorithm.val();
  var N = parseInt(n.val());

  var reader = new FileReader();
  reader.onload = function(e) {
    img.attr('src', e.target.result);
    //延时是为了让src生效(在firefox里面上面这句居然是异步的);
    setTimeout(function () {
      img.show();
      img.get(0).width = img.width() > 400 ? 400 : img.width();
      img.get(0).height = img.height() > 300 ? 300 : img.height();
      img.hide();
      imgW = img.width();
      imgH = img.height();
      console.log(imgW);
      console.log(imgH);
      //img.attr('style', 'display: none;');
      if (algo === 'k-means') {
        canvas.trigger('k-means', {imgH: imgH, imgW: imgW, N: N});
      } else {
        canvas.trigger('EM', {imgH: imgH, imgW: imgW, N: N});
      }
    }, 50);
  };
  reader.readAsDataURL(blob);
});

file.change(function (event) {
  blob = event.target.files[0];
});

canvas.on('k-means', function(e, data) {
  canvas.get(0).width = data.imgW;
  canvas.get(0).height = data.imgH;
  canvasOrigin.get(0).width = data.imgW;
  canvasOrigin.get(0).height = data.imgH;
  canvasOrigin.get(0).getContext('2d')
              .drawImage(img.get(0), 0, 0, data.imgW, data.imgH);
  //灰度化图像
  var imagedata = canvasOrigin.get(0).getContext('2d')
                  .getImageData(0,0,data.imgW,data.imgH);
  for (var i=0; i<imagedata.data.length; i+=4) {
    var average = (imagedata.data[i+0]+imagedata.data[i+1]+imagedata.data[i+2])/3;
    imagedata.data[i+0] = imagedata.data[i+1] = imagedata.data[i+2] = average;
  }
  context.putImageData(imagedata, 0, 0);
  console.log(imagedata);
});
