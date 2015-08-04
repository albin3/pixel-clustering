(function () {

  var file= $('#file');
  var blob = null;
  var button = $('#button');
  var algorithm = $('#algorithm');
  var n = $('#n');//分成几类

  var canvasOrigin = $('#canvasOrigin');
  var canvasGray = $('#canvasGray');
  var canvas = $('#canvas');
  var context = canvas.get(0).getContext("2d");
  var img = $('#img');
  var imgH = 0;
  var imgW = 0;

  button.click(function(e) {
    var algo = algorithm.val();
    var N = parseInt(n.val());
    if (algo === 'k-means') {
      canvas.trigger('k-means', {imgH: imgH, imgW: imgW, N: N});
    } else {
      canvas.trigger('k-means', {imgH: imgH, imgW: imgW, N: N});
      //canvas.trigger('EM', {imgH: imgH, imgW: imgW, N: N});
    }
  });

  file.change(function (event) {
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
      }, 50);
    };
    reader.readAsDataURL(event.target.files[0]);
  });

  canvas.on('k-means', function(e, data) {
    //1. 绘制原始图像canvas
    canvasOrigin.get(0).width = data.imgW;
    canvasOrigin.get(0).height = data.imgH;
    canvasOrigin.get(0).getContext('2d')
    .drawImage(img.get(0), 0, 0, data.imgW, data.imgH);

    //2. 绘制灰度化图像canvas
    var imagedata = canvasOrigin.get(0).getContext('2d')
    .getImageData(0,0,data.imgW,data.imgH);
    for (var i=0; i<imagedata.data.length; i+=4) {
      var average = parseInt((imagedata.data[i+0]+imagedata.data[i+1]+imagedata.data[i+2])/3);
      imagedata.data[i+0] = imagedata.data[i+1] = imagedata.data[i+2] = average;
    }
    canvasGray.get(0).width = data.imgW;
    canvasGray.get(0).height = data.imgH;
    canvasGray.get(0).getContext('2d').putImageData(imagedata, 0, 0);

    //3. k-means初始化中心步骤     [已根据点的分布优化]
    canvas.get(0).width = data.imgW;
    canvas.get(0).height = data.imgH;
    context.putImageData(imagedata, 0, 0);

    var nPoints = data.imgW * data.imgH;
    var graySet = [];
    for (i=0; i<256; i++) graySet.push(0);
    for (i=0; i<imagedata.data.length; i+=4) {
      graySet[imagedata.data[i]] += 1;
    }

    var idx = 0;
    var curPoints = 0;
    var pointsNums = [];
    for (i=0; i<data.N; i++) {        //尽量保证初始化后每个类里的点的个数相同，减少迭代次数
      pointsNums.push(                //以三类为例分别取 0.5，1.5，2.5作为初始化三个中心点
        (i+0.5)*nPoints/data.N
      );
    }
    var centerList = [];
    for (i=0; i<graySet.length; i++) {
      curPoints += graySet[i];
      while (idx < data.N && curPoints >= pointsNums[idx]) {
        centerList.push(i);
        idx++;
      }
    }

    //4. 使用k-means迭代聚类图像步骤
    var threshold = 1;
    kmeansIterator(canvasGray.get(0).getContext('2d'), context, centerList, threshold);
  });

  //k-means迭代函数
  function kmeansIterator(grayContext, context, centerList, threshold) {

    //1. 聚类
    var pixelData = grayContext.getImageData(0, 0, imgW, imgH);
    var NSum = [];
    var NCount = [];
    for (var i=0; i<centerList.length; i++) {
      NSum.push(0);
      NCount.push(0);
    }

    for (i=0; i<pixelData.data.length; i+=4) {

      var pixel = pixelData.data[i];
      var n = 0;
      var min = Math.abs(pixel-centerList[0]);

      for (var j=1; j<centerList.length; j++) {
        var current = Math.abs(pixel-centerList[j]);
        if (current < min) {
          n = j;
          min = current;
        }
      }

      NSum[n] += pixelData.data[i+0];
      NCount[n] += 1;
      pixelData.data[i+0] = centerList[n];
      pixelData.data[i+1] = centerList[n];
      pixelData.data[i+2] = centerList[n];
    }
    context.putImageData(pixelData, 0, 0);

    //2. 中心偏移
    //根据本次聚类结果，计算每个类的新的中心
    var newList = [];
    for (i=0; i<centerList.length; i++) {
      newList.push(
        NSum[i]/NCount[i]
      );
    }

    //3. 递归迭代
    //计算新的中心跟老的中心的偏移量，跟阈值比较
    var shift = 0;
    for (i=0; i<centerList.length; i++) {
      shift += Math.abs(centerList[i]-newList[i]);
    }

    if (shift >= threshold) {
      kmeansIterator(grayContext, context, newList, threshold);
    } else {
      return;
    }
  }

  //EM迭代函数
  function emIterator(grayContext, context, centerList, threshold) {
    //TODO: EM迭代，首先找到一个高斯函数库
  }

  //萌妹纸图
  img.load(function(e) {
    var N = parseInt(n.val());
    img.show();
    img.get(0).width = img.width() > 400 ? 400 : img.width();
    img.get(0).height = img.height() > 300 ? 300 : img.height();
    img.hide();
    imgW = img.width();
    imgH = img.height();
    canvas.trigger('k-means', {imgH: imgH, imgW: imgW, N: N});
  });
  img.get(0).src = './img/demo400x250.jpg';

})();
