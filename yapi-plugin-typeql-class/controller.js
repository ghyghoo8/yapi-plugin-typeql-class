
const baseController = require('controllers/base.js');
const yapi = require('yapi.js');
const interfaceModel = require('models/interface.js');

const _ = require('underscore');
const path = require('path');

const ejs = require('ejs')
const htmlTemplete = require('./templete')

//全局设置 nullable = false
let setNullableTrue = false

const { GoogleSpreadsheet } = require('google-spreadsheet');
const SheetID = '18fOZHGGWWvnokAPGrqFMw8MQSNaMBZsA_fencx5PeFU'
class typeqlClass extends baseController {
  constructor(ctx) {
    super(ctx);
    this.interfaceModel = yapi.getInst(interfaceModel);
    this.doc = new GoogleSpreadsheet(SheetID);
  }
  // 获取 google docs 表格数据
  async getIssuesOnlineFromGoogleSheet(ctx) {
    // const secFilePath = path.join(__dirname,'possible-helix-271711-f9a5075fd600.json')
    
    // await this.doc.useServiceAccountAuth(require(secFilePath));
    this.doc.useApiKey('AIzaSyCxSz2RttJ4ufIihngLZK3odRbY38vNglY');

    await this.doc.loadInfo();

    // 获取第一张表
    const sheet = this.doc.sheetsByIndex[0]; // or use doc.sheetsById[id]

    // 渲染模板
    ejs.renderFile(path.join(__dirname, 'templete', 'issues.ejs'),
      { id: sheet.title },
      (err, str) => {
      ctx.response.type = 'html'
      ctx.response.body = err || str  
    });
  }

  async getContent(ctx) {
    const id = ctx.query.id
    const isJSON = ctx.query.json
    setNullableTrue = ctx.query.nullable
    if (id) {
      const d = await this.interfaceModel.get(id)
      if (d) {
        const { title, desc, method, path, username, _id } = d
        const data = await this.renderJsonSchema(d.res_body)
        const renderData =  {
          data,
          title,
          desc,
          method,
          path,
          username,
          _id,
          formatdata: formatTime(new Date())
        }
        // 渲染 model.ts
        if (isJSON) {
          ctx.body = renderData
        } else {
          ctx.body = ejs.render(htmlTemplete, renderData);
        }
      } else {
        ctx.body = {
          errcode: 100002,
          message:`没有该接口数据: id=${id}`
        }
      }
    } else {
      ctx.body = {
        errcode: 100001,
        message:'欢迎使用"typeql-class"插件查询'
      }
    }
  }
  // 解析接口数据结构json===>
  async renderJsonSchema(res_body) {
    const d = yapi.commons.json_parse(res_body)
    return this.renderSchemaForTypeGraphQLTypeDefs(d)
  }
  // 渲染模板，自动生成接口类 for typegraphql
  async renderSchemaForTypeGraphQLTypeDefs(data) {
    const classBodyData = exchangeJsonSchemaForRender(data)
    return classBodyData
  }
}

// 数据转换===>
const exchangeJsonSchemaForRender = (data) => {
  const classList = [] // 放class描述 for item type
  const basicList = [] // 放基本类型描述 for export class
  const basicListKeysOfList = [] //存放已存在的model key，去重用

  let _required = data.required
  let _data = data.properties

  //如果有body，则用body为起点
  if (_.has(_data, 'body') && _.has(_data.body,'properties')) {
      _required = _data.body.required
      _data = _data.body.properties
  }
  // start make basicList=====>
  Object.keys(_data).forEach(name => {
    const nullable = _required ? (!_required.includes(name)) : true
    const res = renderClassItem(name, _data[name], nullable)
    pushItemToBasicList(res)
  })

  // 渲染 object class类型
  function renderClassItem(name, value, _nullable = true) {
    const { description, $$ref, title, type, properties = {}, required } = value
    const nullable = _nullable
    const childrens = Object.keys(properties).map(_name => {
      const v = properties[_name]
      let res = ''
      const _t = v.type.toLowerCase()
      if (_t === 'object') {
        res = renderClassItem(_name, v);
      } else if (_t === 'array') {
        res = renderArrayItem(_name, v);
      } else {
        res = renderBaseItem(_name, v, required);
      }
      return res;
    })
    let item = {
      desc: description || $$ref || name,
      name,
      type,
      title,
      nullable,
      childrens,
    }

    if (type.toLowerCase().includes('object') ) {
      pushItemToClassList(item)
    }

    // 如果是数组，则再make一次
    if (type.toLowerCase().includes('array')) {
      item = renderArrayItem(name, value)
    }

    return item
  }
  // 渲染 数组类型
  function renderArrayItem(name, value) {
    const { description, format, items } = value
    let type = value.type
    // 如果是object，则创建class===>
    if (items.type.toLowerCase() === 'object') {
      type = `${name}Item`
      renderClassItem(type, items);
    }
    const nullable = true
    const item = {
      // "defaultValue": [],
      desc: description || name,
      format, 
      name,
      type,
      nullable,
      isArray: true,
      items
    }
    
    return addBigTypeItem(item)
  }
  // 渲染 基础类型
  function renderBaseItem(name, value, required = []) {
    const { description, type, format } = value
    const nullable = setNullableTrue? true : (!required.includes(name))
    const item = {
      "defaultValue": value.default,
      desc: description || name,
      format, 
      name,
      type,
      nullable
    }
    
    return addBigTypeItem(item)
  }

  // 保证basicClass的key唯一，去重===>
  function pushItemToBasicList(item) {
    if (basicListKeysOfList.includes(item.name)) {
      return 
    }
    basicList.push(addBigTypeItem(item))
    basicListKeysOfList.push(item.name)
  }
  function pushItemToClassList(item) {
    classList.push(addBigTypeItem(item))
  }


  return { classList, basicList }
}


// 生成 _type_ => 值
function addBigTypeItem(item) {
  const TypeEmun = {
    'string': "String",
    'number': 'Int',
    'integer': 'Int',
    'boolean': 'Boolean',
    'double': 'Float',
  }
  const t = item.type.toLowerCase();
  const bigT = toUpCaseFir(item.type)
  const f = item.format;
  if (t === 'object') {
    item.type = toUpCaseFir(item.name)
    item.bigType = `_type_ => ${item.type}, `
  } else if (t === 'array') { 
    item.type = item.items.type
    const _itemsT = TypeEmun[item.type]
    // const _itemsF = item.items.format
    item.bigType = _itemsT ? `_type_ => [${_itemsT}], ` : ''
  } else {
    const bigType = TypeEmun[t] || TypeEmun[f] || bigT
    item.bigType = item.isArray ? `_type_ => [${bigType}], ` : `_type_ => ${bigType}, `
  }
  // 不是基础类型，则要声明映射。自带换行
  if (!TypeEmun[item.type.toLowerCase()]) {
    item.transformerType = `@Type(() => ${toUpCaseFir(item.type)})\n  ` 
  }
  return item
}

 // 时间格式化
 function formatTime(date) {
  const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : '0' + n
  }
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
 
  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':')
 }

function toUpCaseFir(str) {
   return str.replace(/^\S/, s => s.toUpperCase())
 }



module.exports = typeqlClass;