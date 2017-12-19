(function () {
  var file= $('#file');
  var blob = null;
  var algorithm = $('#algorithm');
  // clustering number
  var n = $('#n');
  // original picture
  var canvasOrigin = $('#canvasOrigin');
  // gray scale picture
  var canvasGray = $('#canvasGray');
  var canvas = $('#canvas');
  var context = canvas.get(0).getContext("2d");
  var img = $('#img');
  var imgH = 0;
  var imgW = 0;

  file.change(function (event) {
    var reader = new FileReader();
    reader.onload = function(e) {
      img.attr('src', e.target.result);
      // firefox compatibility
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
    // 1. draw original picture on canvas
    canvasOrigin.get(0).width = data.imgW;
    canvasOrigin.get(0).height = data.imgH;
    canvasOrigin.get(0).getContext('2d')
    .drawImage(img.get(0), 0, 0, data.imgW, data.imgH);

    // 2. draw gray scale picture on canvas
    var imagedata = canvasOrigin.get(0).getContext('2d')
    .getImageData(0,0,data.imgW,data.imgH);
    for (var i=0; i<imagedata.data.length; i+=4) {
      var average = parseInt((imagedata.data[i+0]+imagedata.data[i+1]+imagedata.data[i+2])/3);
      imagedata.data[i+0] = imagedata.data[i+1] = imagedata.data[i+2] = average;
    }
    canvasGray.get(0).width = data.imgW;
    canvasGray.get(0).height = data.imgH;
    canvasGray.get(0).getContext('2d').putImageData(imagedata, 0, 0);

    // 3. initialize k-means centers.
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
    for (i=0; i<data.N; i++) {
      // k-means centers are 0.5/N，1.5/N ... (N-0.5)/N.
      pointsNums.push(
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

    // 4. set break threshold and iterate.
    var threshold = 1;
    kmeansIterator(canvasGray.get(0).getContext('2d'), context, centerList, threshold);
  });

  // k-means iterate function
  function kmeansIterator(grayContext, context, centerList, threshold) {
    // 1. clustering
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

    // 2. center shift: calculate new center.
    var newList = [];
    for (i=0; i<centerList.length; i++) {
      newList.push(
        NSum[i]/NCount[i]
      );
    }

    // 3. calculate absolute residual sum.
    var shift = 0;
    for (i=0; i<centerList.length; i++) {
      shift += Math.abs(centerList[i]-newList[i]);
    }

    // 4. compare absolute residual sum with threshold.
    if (shift >= threshold) {
      kmeansIterator(grayContext, context, newList, threshold);
    } else {
      return;
    }
  }

  canvas.on('EM', function(e, data) {
    // 1. draw original canvas
    canvasOrigin.get(0).width = data.imgW;
    canvasOrigin.get(0).height = data.imgH;
    canvasOrigin.get(0).getContext('2d')
    .drawImage(img.get(0), 0, 0, data.imgW, data.imgH);

    // 2. draw gray scale canvas
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
    for (i=0; i<data.N; i++) {
      pointsNums.push(
        (i+0.5)*nPoints/data.N
      );
    }
    // mutiple gauss means
    var means = [];
    for (i=0; i<graySet.length; i++) {
      curPoints += graySet[i];
      while (idx < data.N && curPoints >= pointsNums[idx]) {
        means.push(i);
        idx++;
      }
    }
    // multiple gauss variances
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
    // initialize weight of each gauss distribution
    var p = [];
    for (i=0; i<data.N; i++) {
      p.push(1/data.N);
    }

    // generate gauss clusters
    var clusters = [];
    for (i=0; i<data.N; i++) {
      clusters.push({
        feature: gaussian(means[i], variances[i]),
        p: p[i]
      });
    }

    // set threshold and iterate.
    var threshold = 1;
    likehood = undefined;
    emIterator(graySet, canvasGray.get(0).getContext('2d'), context, clusters, threshold);
  });

  // EM algorithm iterate function
  function emIterator(graySet, grayContext, context, clusters, threshold) {
    // E-step - cluster pixels to current clusters.
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

    //M-step - calculate new clusters
    // 1. N_k - sum number of pixels each cluster have.
    var N_k = [];
    var N = 0;
    for (i=0; i<clusters.length; i++) {
      N_k[i] = 0;
      for (j=0; j<graySet.length; j++) {
        N_k[i] += graySet[j]*p_k[j][i];
      }
      N += N_k[i];
    }

    // 2. u_k  - mean value of each cluster.
    var u_k = [];
    for (i=0; i<clusters.length; i++) {
      mid = 0;
      u_k[i] = 0;
      for(j=0; j<graySet.length; j++) {
        mid += graySet[j]*p_k[j][i]*j;
      }
      u_k[i] = mid/N_k[i];
    }

    // 3. v_k - variances of each cluster
    var v_k = [];
    for (i=0; i<clusters.length; i++) {
      mid = 0;
      v_k[i] = 0;
      for (j=0; j<graySet.length; j++) {
        mid += graySet[j]*p_k[j][i]*(u_k[i]-j)*(u_k[i]-j);
      }
      v_k[i] = mid/N_k[i];
    }

    // 4. pi_k - update weight of every cluster
    for(i=0; i<clusters.length; i++) {
      clusters[i].p = N_k[i]/N;
      clusters[i].feature = gaussian(u_k[i], v_k[i]);
    }

    // 5. update canvas context
    var pixelData = grayContext.getImageData(0, 0, imgW, imgH);
    for (i=0; i<pixelData.data.length; i+=4) {
      var pixel = parseInt(u_k[n_class[pixelData.data[i]]]);
      pixelData.data[i+0] = pixel;
      pixelData.data[i+1] = pixel;
      pixelData.data[i+2] = pixel;
    }
    context.putImageData(pixelData, 0, 0);

    // 6. calculate likehood and compare likehood with threshold.
    var new_likehood = 0;
    for (j=0; j<graySet.length; j++) {
      mid = 0;
      for (i=0; i<clusters.length; i++) {
        mid += clusters[i].p*clusters[i].feature.pdf(j);
      }
      new_likehood += graySet[i]*Math.log10(mid);
    }
    if (likehood === undefined) {
      likehood = new_likehood;
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

  function beginCluster() {
    var algo = algorithm.val();
    if (algo !== 'k-means' && algo !== 'EM') algo = 'k-means';
    var N = parseInt(n.val());
    if (isNaN(N)) N = 3;
    img.show();
    img.get(0).width = img.width() > 400 ? 400 : img.width();
    img.get(0).height = img.height() > 300 ? 300 : img.height();
    img.hide();
    imgW = img.width();
    imgH = img.height();
    canvas.trigger(algo, {imgH: imgH, imgW: imgW, N: N});
  }

  algorithm.change(function(e) {
    beginCluster();
  });

  n.change(function(e) {
    beginCluster();
  });

  img.load(function(e) {
    beginCluster();
  });
  img.get(0).src = './img/demo400x250.jpg';
})();
