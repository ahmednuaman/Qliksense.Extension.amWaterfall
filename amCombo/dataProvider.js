if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

if (typeof Object.create !== "function") {
    Object.create = function (proto, propertiesObject) {
        if (!(proto === null || typeof proto === "object" || typeof proto === "function")) {
            throw TypeError('Argument must be an object, or null');
        }
        var temp = new Object();
        temp.__proto__ = proto;
        if(typeof propertiesObject ==="object")
            Object.defineProperties(temp,propertiesObject);
        return temp;
    };
}

var DataProvider = function(hyperCube) {
  var self = this;
  self.hyperCube = hyperCube;
  self.dataProvider = [];
  self.amGraphs = [];
  self.trendLines = [];
};

DataProvider.prototype.addGraphs = function() {
  var self = this;
  self.hyperCube.qMeasureInfo.forEach(function(measureDef, mindex) {
    var graph;
    if (measureDef.amGraph.type == 'Waterfall') {
      graph = new DataGraphWaterfall(measureDef);
    } else {
      graph = new DataGraph(measureDef);
    }
    graph.showColors();
    graph.showLabel();
    self.amGraphs.push(graph);
  });
};

var DataGraph = function(measureDef) {
  var self = this;
  self.measureDef = measureDef;
  self.type = measureDef.amGraph.type;
  self.colorField = 'color' + measureDef.cId;
  self.lineColorField = 'lineColor' + measureDef.cId;
  self.fillColorsField = 'color' + measureDef.cId;
  self.id = measureDef.cId;
  self.title = measureDef.qFallbackTitle;
  self.bulletBorderAlpha = 1;
  self.hideBulletsCount = 50;
  self.useLineColorForBulletBorder = true;
  self.balloonText = "<b>[[title]]</b><br/>[[text" + measureDef.cId + "]]";
  self.valueAxis = measureDef.amGraph.valueAxis;
  self.fillAlphas = measureDef.amGraph.fillAlphas;
  self.fontSize = measureDef.amGraph.fontSize;
  self.columnWidth = measureDef.amGraph.columnWidth;
  self.clustered = measureDef.amGraph.clustered;
  self.lineThickness = measureDef.amGraph.lineThickness;
  self.dashLength = measureDef.amGraph.dashLength;
  self.bullet = measureDef.amGraph.bullet;
  self.bulletAlpha = measureDef.amGraph.bulletAlpha;
  self.bulletColor = measureDef.amGraph.bulletColor;
  self.bulletSize = measureDef.amGraph.bulletSize;
  self.labelOffset = measureDef.amGraph.labelOffset;
  self.labelPosition = measureDef.amGraph.labelPosition;
  self.labelRotation = measureDef.amGraph.labelRotation;
  self.behindColumns = measureDef.amGraph.behindColumns;
  self.valueField = measureDef.cId;
};

DataGraph.prototype.showLabel = function() {
  var self = this;
  if (self.measureDef.amGraph.showLabel === true) {
    self.labelText = "[[text" + self.measureDef.cId + "]]";
  }
};

DataGraph.prototype.showColors = function() {
  var self = this;
  if (self.measureDef.amGraph.fillColors != 'Error: Invalid or Empty Expression.') {
    self.lineColor = self.measureDef.amGraph.fillColors;
  }
};

var DataGraphWaterfall = function(measureDef) {
  var self = this;
  DataGraph.call(self, measureDef);
  self.type = 'column';
  self.openField = "open" + measureDef.cId;
  self.valueField = "close" + measureDef.cId;
};

DataGraphWaterfall.prototype = Object.create(DataGraph.prototype);
DataGraphWaterfall.prototype.constructor = DataGraphWaterfall;

DataGraph.prototype.showColors = function() {
  var self = this;
  if (self.measureDef.amGraph.fillColors != 'Error: Invalid or Empty Expression.') {
    self.lineColor = self.measureDef.amGraph.fillColors;
  } else {
    self.lineColor = (self.measureDef.waterfall.start < self.measureDef.waterfall.end ? '#54cb6a' : '#cc4b48');
  }
};

DataProvider.prototype.addData = function() {
  var self = this;
  self.hyperCube.qDataPages.forEach(function(page, pindex) {
    page.qMatrix.forEach(function(row, rindex) {
      var dataRow = new DataRow(row, rindex, self.hyperCube, self);
      dataRow.addRowData();
    });
  });
};

var DataRow = function(row, rindex, hyperCube, dataProvider) {
  var self = this;
  self.dataProvider = dataProvider;
  self.hyperCube = hyperCube;
  self.row = row;
  self.rindex = rindex;
  self.rowObject = {};
};

DataRow.prototype.isCellDimension = function(cindex) {
  var self = this;
  return cindex < self.hyperCube.qDimensionInfo.length;
};

DataRow.prototype.isCellWaterfall = function(cindex) {
  var self = this;
  return self.hyperCube.qMeasureInfo[cindex - self.hyperCube.qDimensionInfo.length].amGraph.type == 'Waterfall';
};

DataRow.prototype.findCellId = function(isDimension, cindex) {
  var self = this;
  if (isDimension) {
    return self.hyperCube.qDimensionInfo[cindex].cId;
  } else {
    return self.hyperCube.qMeasureInfo[cindex - self.hyperCube.qDimensionInfo.length].cId;
  }
};

DataRow.prototype.addRowData = function() {
  var self = this;
  var dataPointStart = {};
  var dataPointEnd;

  self.row.forEach(function(cell, cindex) {
    var isDimension = self.isCellDimension(cindex);
    var cellId = self.findCellId(isDimension, cindex);
    var dataPoint;
    var lastClose;

    switch (isDimension) {
      // DIMENSION
      case true:
        dataPoint = new DimensionPoint(self.hyperCube, self.rindex, cell, cindex, cellId);
        dataPoint.addAllData();
        self.rowObject = Object.assign(self.rowObject, dataPoint.values);
        break;

        // MEASURE
      case false:
        var isWaterfall = self.isCellWaterfall(cindex);

        switch (isWaterfall) {

          // WATERFALL MEASURE
          case true:
            switch (self.rindex) {

              // START OF WATERFALL
              case 0:
                dataPointStart = new WaterfallPointBounds(self.hyperCube, self.rindex, cell, cindex, cellId, 0, 'start');
                dataPointStart.addAllData();
                self.dataProvider.dataProvider.push(dataPointStart.values);
                break;

                // END OF WATERFALL
              case self.hyperCube.qSize.qcy - 1:
                dataPointEnd = new WaterfallPointBounds(self.hyperCube, self.rindex, cell, cindex, cellId, 0, 'end');
                dataPointEnd.addAllData();
                break;
            }

            // ALL OTHER POINTS OF WATERFALL
            lastClose = self.dataProvider.dataProvider[self.rindex]['close' + cellId];
            dataPoint = new WaterfallPoint(self.hyperCube, self.rindex, cell, cindex, cellId, lastClose);
            dataPoint.addAllData();
            self.rowObject = Object.assign(self.rowObject, dataPoint.values);
            trendLinePoint = new TrendLinePoint(self.dataProvider, dataPoint, self.rowObject);
            self.dataProvider.trendLines.push(trendLinePoint);
            break;

            // STANDARD MEASURE
          case false:
            dataPoint = new MeasurePoint(self.hyperCube, self.rindex, cell, cindex, cellId);
            dataPoint.addAllData();
            self.rowObject = Object.assign(self.rowObject, dataPoint.values);
            break;
        }
    }

  });

  // FINAL WATERFALL VALUE
  self.dataProvider.dataProvider.push(self.rowObject);
  if (self.hyperCube.qSize.qcy - 1 === self.rindex && typeof dataPointEnd != 'undefined') {
    self.dataProvider.dataProvider.push(dataPointEnd.values);
    trendLinePoint = new TrendLinePoint(self.dataProvider, dataPointEnd , self.rowObject);
    trendLinePoint.alterLastPoint();
    self.dataProvider.trendLines.push(trendLinePoint);
  }
};

var TrendLinePoint = function(dataProvider, dataPoint, rowObject) {
  var self = this;
  self.dataPoint = dataPoint;
  self.rowObject = rowObject;
  self.dashLength = 3;
  self.finalCategory = rowObject.dimText;
  self.initialCategory = dataProvider.dataProvider[dataPoint.rindex].dimText;
  self.initialValue = dataPoint.lastClose;
  self.finalValue = rowObject['open' + dataPoint.cellId];
  self.lineColor = '#888888';
};

TrendLinePoint.prototype.alterLastPoint = function() {
  var self = this;
  self.initialCategory = self.rowObject.dimText;
  self.initialValue = self.rowObject['close' + self.dataPoint.cellId];
  self.finalValue = self.dataPoint.hyperCube.qMeasureInfo[self.dataPoint.cindex - self.dataPoint.hyperCube.qDimensionInfo.length].waterfall.end;
  self.finalCategory = self.dataPoint.hyperCube.qMeasureInfo[self.dataPoint.cindex - self.dataPoint.hyperCube.qDimensionInfo.length].waterfall.endLabel;
};

var DataPoint = function(hyperCube, rindex, cell, cindex, cellId) {
  var self = this;
  self.hyperCube = hyperCube;
  self.cell = cell;
  self.cindex = cindex;
  self.rindex = rindex;
  self.cellId = cellId;
  self.values = {};
};

DataPoint.prototype.addPointData = function() {
  var self = this;
  self.values['text' + self.cellId] = self.cell.qText;
  self.values[self.cellId] = (self.cell.qNum == 'NaN' ? self.cell.qText : self.cell.qNum);
};

DataPoint.prototype.addAllData = function() {
  var self = this;
  self.addPointData();
};

var DimensionPoint = function(hyperCube, rindex, cell, cindex, cellId) {
  var self = this;
  DataPoint.call(self, hyperCube, rindex, cell, cindex, cellId);
};

DimensionPoint.prototype = Object.create(DataPoint.prototype);
DimensionPoint.prototype.constructor = DimensionPoint;

DimensionPoint.prototype.addDimensionData = function() {
  var self = this;
  self.values['elemNumber' + self.cellId] = self.cell.qElemNumber;
  self.values.dimText = self.cell.qText;
};

DimensionPoint.prototype.addAllData = function() {
  var self = this;
  self.addPointData();
  self.addDimensionData();
};

var MeasurePoint = function(hyperCube, rindex, cell, cindex, cellId) {
  var self = this;
  DataPoint.call(self, hyperCube, rindex, cell, cindex, cellId);
};

MeasurePoint.prototype = Object.create(DataPoint.prototype);
MeasurePoint.prototype.constructor = MeasurePoint;

MeasurePoint.prototype.addMeasureData = function() {
  var self = this;
  if (typeof self.cell.qAttrExps.qValues[0].qText != 'undefined') {
    self.values['color' + self.cellId] = self.cell.qAttrExps.qValues[0].qText;
  }
  if (typeof self.cell.qAttrExps.qValues[1].qText != 'undefined') {
    self.values['lineColor' + self.cellId] = self.cell.qAttrExps.qValues[1].qText;
  }
};

MeasurePoint.prototype.addAllData = function() {
  var self = this;
  self.addPointData();
  self.addMeasureData();
};

var WaterfallPoint = function(hyperCube, rindex, cell, cindex, cellId, lastClose) {
  var self = this;
  MeasurePoint.call(self, hyperCube, rindex, cell, cindex, cellId);
  self.lastClose = lastClose;
};

WaterfallPoint.prototype = Object.create(MeasurePoint.prototype);
WaterfallPoint.prototype.constructor = WaterfallPoint;

WaterfallPoint.prototype.addWaterfallData = function() {
  var self = this;
  var open = self.lastClose;
  var close = self.lastClose + self.cell.qNum;

  self.values['open' + self.cellId] = open;
  self.values['close' + self.cellId] = close;

  if (typeof self.cell.qAttrExps.qValues[0].qText == 'undefined') {
    self.values['color' + self.cellId] = open < close ? '#54cb6a' : '#cc4b48';
  }
  if (typeof self.cell.qAttrExps.qValues[1].qText == 'undefined') {
    self.values['lineColor' + self.cellId] = '#888888';
  }

};

WaterfallPoint.prototype.addAllData = function() {
  var self = this;
  self.addPointData();
  self.addMeasureData();
  self.addWaterfallData();
};

var WaterfallPointBounds = function(hyperCube, rindex, cell, cindex, cellId, lastClose, bound) {
  var self = this;
  WaterfallPoint.call(self, hyperCube, rindex, cell, cindex, cellId, lastClose);
  self.bound = bound;
  self[bound] = hyperCube.qMeasureInfo[cindex - hyperCube.qDimensionInfo.length].waterfall[bound];
  self[bound + 'label'] = hyperCube.qMeasureInfo[cindex - hyperCube.qDimensionInfo.length].waterfall[bound + 'Label'];
  self[bound + 'visible'] = true;
  self[bound + 'color'] = "#1c8ceb";
};

WaterfallPointBounds.prototype = Object.create(WaterfallPoint.prototype);
WaterfallPointBounds.prototype.constructor = WaterfallPointBounds;

WaterfallPointBounds.prototype.addWaterfallBound = function() {
  var self = this;
  self.values['text' + self.hyperCube.qDimensionInfo[0].cId] = self[self.bound + 'label'];
  self.values['text' + self.cellId] = self[self.bound];
  self.values['elemNumber' + self.hyperCube.qDimensionInfo[0].cId] = -2;
  self.values['open' + self.cellId] = 0;
  self.values['close' + self.cellId] = self.lastClose + self[self.bound];
  self.values['color' + self.cellId] = self[self.bound + 'color'];
  self.values.dimText = self[self.bound + 'label'];
  var qFormat = self.hyperCube.qMeasureInfo[self.cindex - self.hyperCube.qDimensionInfo.length].qNumFormat.qFmt;
  console.log(numeral(self[self.bound]).format(qFormat));

};

WaterfallPointBounds.prototype.addAllData = function() {
  var self = this;
  self.addPointData();
  self.addMeasureData();
  self.addWaterfallData();
  self.addWaterfallBound();
};
