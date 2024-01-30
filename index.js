const { log } = require('console');
const express = require('express');
const router = express.Router();
const XLSX = require('node-xlsx')
const path = require('path');


router.use('/',function(req, res, next) {
  
//将excel转化成json文件
  const jsonUrl = path.join(process.cwd(), './public/1.xlsx');
  let data = XLSX.parse(jsonUrl)[0].data;     //原始数据命名为data
  // 请求地址  /api/save_excel_data
  // console.log(data)
  // console.log(req.query);  //get请求接受参数
  // console.log(req.body);   //post请求接受参数
  // res.commit('aaaaaa','','成功')     //commit参数含义   返回数据   错误提示   正确提示


  // let list = data.splice(10,152);
  // console.log(list)

// 一、提取基本流量表
function basicFlowmeterTable(data){
  var list=[]
  for(var i in data){
    if(i>=10 && i<152){      //取第11行——152行的数据
      var arr=[]
      for(var t in data[i]){
          if((t>=3 && t<145)){     //取每行的第3列——145列的数据
             arr.push(data[i][t])
          }
        }
      list.push(arr);
    }
  }
//   for(let n in list){
//     list[n].splice(0, 2); //(1,1)
// }
// list.unshift(data[6])  //添加产业名称 行
  return list;
}

var basic=[];          //基本流量表的二维数组
var data_a = JSON.parse(JSON.stringify(data));
basic = basicFlowmeterTable(data_a);
// console.log(basic);


// 二、矩阵转换成单位矩阵
function convertToIdentityMatrix(matrix) {
  var identity = [];     // 存放结果的单位矩阵
  
  for (var i = 0; i < matrix.length; i++) {
      identity[i] = new Array(); // 初始化每行
      
      for (var j = 0; j < matrix[i].length; j++) {
          if (i === j) {
              identity[i][j] = 1; // 对角线上的元素设置为1
          } else {
              identity[i][j] = 0; // 非对角线上的元素设置为0
          }
      }
  }
  return identity;
}
var basic_a = JSON.parse(JSON.stringify(basic));
var identityMatrix = convertToIdentityMatrix(basic_a);    //得到基本流量表的单位矩阵
// console.log(identityMatrix);


// 三、直接消耗系数A

function consumptionCoefficientA(arr1,arr2){
  var divisor = arr1[158];    //divisor为原始数据的最后一行“总投入”
  divisor.splice(0, 3);
  divisor.splice(142,1);    //得到最后一列的总投入数据ABCD
  // console.log(divisor);
  var arr4 = [];
    for(var i in arr2){
      var arr3 = [];
      for(var t in arr2[i]){
          if(divisor[t]===0){    //判断除数是否为0，为0则置0
          arr3.push(0);
        }else{
          arr3.push(arr2[i][t]/divisor[t]);  //每一部门的投入➗总投入
        }
      }
      arr4.push(arr3);
    }
  return arr4;
}

var data_b = JSON.parse(JSON.stringify(data));
var basic_b = JSON.parse(JSON.stringify(basic));
var coefficientA = consumptionCoefficientA(data_b,basic_b);  //直接消耗系数A
// console.log(coefficientA);  

// 四、直接分配系数H
function consumptionCoefficientH(arr1,arr2){
  var divisor = arr1[158];   //divisor为原始数据的最后一行“总投入”
  divisor.splice(0, 3);
  divisor.splice(142,1);  //得到最后一列的数据ABCD
  // console.log(divisor);
  var arr4 = [];
    for(var i in arr2){
      var arr3 = [];
      for(var t in arr2[i]){
        if(divisor[i]===0){    //判断除数是否为0，为0则置0
          arr3.push(0);
        }else{
          arr3.push(arr2[i][t]/divisor[i])  //每一部门的投入➗总投入
        }
      }
      arr4.push(arr3);
    }
  return arr4;
}

var data_c = JSON.parse(JSON.stringify(data));
var basic_c = JSON.parse(JSON.stringify(basic));
var coefficientH = consumptionCoefficientH(data_c,basic_c);  //直接分配系数H
// console.log(coefficientH);  

//五、矩阵减法
function subtractMatrix(matrix1, matrix2) {
  // 获取矩阵的行数和列数
  var rows = matrix1.length;
  var cols = matrix1[0].length;
  if (rows !== matrix2.length || cols !== matrix2[0].length) {
      throw new Error("The two matrices must have the same dimensions.");
  }
  // 创建新的空白矩阵存放结果
  var result = [];
  for (var i = 0; i < rows; i++) {
      result[i] = [];
      for (var j = 0; j < cols; j++) {
          result[i][j] = matrix1[i][j] - matrix2[i][j];
      }
  }
  return result;
}

//六、求逆矩阵
// 高斯约旦消元法求逆矩阵

function inverseMatrix(matrix) {
  const n = matrix.length;
  const augmentedMatrix = augmentMatrix(matrix, createIdentityMatrix(n));

  // 进行高斯约旦消元法
  for (let i = 0; i < n; i++) {
      // 将当前主元归一
      const currentElement = augmentedMatrix[i][i];
      for (let j = 0; j < 2 * n; j++) {
          augmentedMatrix[i][j] /= currentElement;
      }

      // 消去其他行的当前列元素
      for (let k = 0; k < n; k++) {
          if (k !== i) {
              const factor = augmentedMatrix[k][i];
              for (let j = 0; j < 2 * n; j++) {
                  augmentedMatrix[k][j] -= factor * augmentedMatrix[i][j];
              }
          }
      }
  }

  // 提取逆矩阵部分
  const inverse = [];
  for (let i = 0; i < n; i++) {
      inverse.push(augmentedMatrix[i].slice(n));
  }

  return inverse;
}

// 创建单位矩阵
function createIdentityMatrix(n) {
  const identityMatrix = [];
  for (let i = 0; i < n; i++) {
      const row = Array(n).fill(0);
      row[i] = 1;
      identityMatrix.push(row);
  }
  return identityMatrix;
}

// 合并矩阵
function augmentMatrix(matrix1, matrix2) {
  return matrix1.map((row, i) => row.concat(matrix2[i]));
}

// let result = inverseMatrix(inputMatrix);
// console.log("逆矩阵：", result);


// 七、求L
let I_A = [];
I_A = subtractMatrix(identityMatrix, coefficientA) //求得I-A
// console.log(I_A); 
// let L=[];
L = inverseMatrix(I_A)  //求I-A的逆矩阵，得到L
// console.log(L);


//八、求G
let I_H = [];
I_H = subtractMatrix(identityMatrix, coefficientH) //求I-H
// console.log(I_H);
let G=[];
G = inverseMatrix(I_H); //求I-H的逆矩阵，得到G   
console.log(G);                     


//九、完全消耗系数L-I
let coefficientL_I =[];
coefficientL_I = subtractMatrix(L,identityMatrix)
// console.log(coefficientL_I)


//十、完全分配系数G-I
let coefficientG_I=[];
coefficientG_I = subtractMatrix (G,identityMatrix);
// console.log(G)
// console.log(coefficientG_I)

//十一、影响力系数
function influenceCoefficient(data){
  let columnSum = data[152];                 
  columnSum.splice(145);
  columnSum.splice(0,3);            // //获得列和
  let sum =0;
  let average=0;
  for(let i=0; i<columnSum.length; i++){
    sum +=columnSum[i];
  }
  average = sum/columnSum.length;              //列和平均数
  let result=[];
  for(let i =0;i<columnSum.length;i++){   
    result.push(columnSum[i]/average);     //每个列和➗列和平均数
  }
  return result;
}

var data_d = JSON.parse(JSON.stringify(data));
let coefficientInf=[];
coefficientInf=influenceCoefficient(data_d); //求得影响力系数
// console.log(coefficientInf);

//十二、感应系数
function inductionCoefficient(data){
  let rowSum =[];                    //获得行和
  for(let i in data){
    rowSum.push(data[i][145]);
 }
 rowSum.splice(152);
 rowSum.splice(0,10);
 let average =0;
 let sum =0;
 for(let i=0; i<rowSum.length; i++){
      sum +=rowSum[i];
    }
    average = sum/rowSum.length;   //行和平均数
    let result=[];
    for(let t=0; t< rowSum.length; t++){
      result.push(rowSum[t]/average);   //每个行和➗行和平均数
    }
 return result;
}

var data_e = JSON.parse(JSON.stringify(data));
let coefficientInd=[];
coefficientInd=inductionCoefficient(data_e);   //求得感应系数
// console.log(coefficientInd);






});

module.exports = router;
