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
      canvas.trigger('EM', {imgH: imgH, imgW: imgW, N: N});
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

  canvas.on('EM', function(e, data) {
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
    //多个正态分布的中心
    var means = [];
    for (i=0; i<graySet.length; i++) {
      curPoints += graySet[i];
      while (idx < data.N && curPoints >= pointsNums[idx]) {
        means.push(i);
        idx++;
      }
    }
    //多个正态分布的方差
    var variances = [];
    curPoints = 0;
    idx = 0;
    var sum = 0;
    var sum_points = 0;
    for (i=0; i<graySet.length; i++) {
      curPoints += graySet[i];
      sum += (graySet[i]-means[idx])*(graySet[i]-means[idx]);
      sum_points += graySet[i];
      while (idx < data.N && curPoints >= pointsNums[idx]) {
        variances.push(sum/sum_points);
        sum = 0;
        sum_points = 0;
        idx++;
      }
    }
    //多个正太分布的权重
    var p = [];
    for (i=0; i<data.N; i++) {
      p.push(1/data.N);
    }

    //构造分布
    var clusters = [];
    for (i=0; i<data.N; i++) {
      clusters.push({
        feature: gaussian(means[i], variances[i]),
        p: p[i]
      });
    }

    //初始化EM并调用迭代，直接在直方图上进行迭代0~255，而不是对整个图片像素作为对象进行迭代 graySet
    var threshold = 1;
    likehood = undefined;
    emIterator(graySet, canvasGray.get(0).getContext('2d'), context, clusters, threshold);
  });

  //EM迭代函数
  function emIterator(graySet, grayContext, context, clusters, threshold) {
    //E-step       [聚类]
    var n_class = [];
    var max_pdf = 0;

    var p_k = [];
    var i = 0, j = 0;
    var mid = 0;
    for (i=0; i<graySet.length; i++) {
      mid = 0;
      max_pdf = 0;
      n_class[i] = 0;
      for (j=0; j<clusters.length; j++) {
        var pdf = clusters[j].feature.pdf(i);
        if (pdf > max_pdf) {
          n_class[i] = j;
          max_pdf = pdf;
        }
        mid += pdf;
      }
      p_k[i] = {};
      for (j=0; j<clusters.length; j++) {
        p_k[i][j] = clusters[j].p*clusters[j].feature.pdf(i)/mid;
      }
    }
    //M-step       [重新计算样本中心，及方差]

    //1 更新N_k  每个样本集的样本个数
    var N_k = [];
    var N = 0;
    for (i=0; i<clusters.length; i++) {
      N_k[i] = 0;
      for (j=0; j<graySet.length; j++) {
        N_k[i] += graySet[j]*p_k[j][i];
      }
      N += N_k[i];
    }

    //2 更新u_k  每个样本集的均值
    var u_k = [];
    for (i=0; i<clusters.length; i++) {
			mid = 0;
      u_k[i] = 0;
			for(j=0; j<graySet.length; j++) {
        mid += graySet[j]*p_k[j][i]*j;
			}
			u_k[i] = mid/N_k[i];
    }

    //3 更新v_k  每个样本集的方差
    var v_k = [];
    for (i=0; i<clusters.length; i++) {
      mid = 0;
      v_k[i] = 0;
      for (j=0; j<graySet.length; j++) {
				mid += graySet[j]*p_k[j][i]*(u_k[i]-j)*(u_k[i]-j);
      }
			v_k[i] = mid/N_k[i];
    }

    //4 更新pi_k  每个样本集的权重
		for(i=0; i<clusters.length; i++) {
			clusters[i].p = N_k[i]/N;
      clusters[i].feature = gaussian(u_k[i], v_k[i]);
		}

    //更新context
    var pixelData = grayContext.getImageData(0, 0, imgW, imgH);
    for (i=0; i<pixelData.data.length; i+=4) {
      var pixel = parseInt(u_k[n_class[pixelData.data[i]]]);
      pixelData.data[i+0] = pixel;
      pixelData.data[i+1] = pixel;
      pixelData.data[i+2] = pixel;
    }
    context.putImageData(pixelData, 0, 0);

    //阈值决定是否继续迭代
    var new_likehood = 0;
		for (j=0; j<graySet.length; j++) {
			mid = 0;
			for (i=0; i<clusters.length; i++) {
				mid += clusters[i].p*clusters[i].feature.pdf(j);
			}
			new_likehood += graySet[i]*Math.log10(mid);
		}
    if (likehood === undefined) {
      likehood = new_likehood;  //global
      emIterator(graySet, grayContext, context, clusters, threshold);
    } else {
      if (Math.abs(likehood-new_likehood) < threshold) {
        return;
      } else {
        likehood = new_likehood;
        emIterator(graySet, grayContext, context, clusters, threshold);
      }
    }
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
