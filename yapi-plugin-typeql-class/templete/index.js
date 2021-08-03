module.exports = `/**
 * @api_id <%= _id %>
 * @title <%= title %>
 * @desc <%= desc %>
 * @method <%= method %>
 * @path '<%= path %>'
 * @author yapi
 * @date <%= formatdata %>
 */
import {
  Field,
  ObjectType,
  ID,
  Int,
  Float,
} from 'type-graphql'
import { Type } from 'class-transformer'
<% const toUpCaseFir = str => str.replace(/^\\S/, s => s.toUpperCase());const toArrStr = v => v.isArray?(toUpCaseFir(v.type)+'[]'):v.type; %>
//=================== 这里是 class ===================
<% data.classList.map(item=>{ %>
@ObjectType({ description: '<%= item.desc %>' })
class <%= toUpCaseFir(item.name) %> {
  <% item.childrens.map(_v=>{ _v.type = _v.type.replace("integer","number");if(_v.nullable){ %>
  @Field(<%- _v.bigType %>{ description: '<%= _v.desc %>', nullable: true })
  <%- _v.transformerType %><%= _v.name %>?: <%= toArrStr(_v) %>
  <% } else { %>
  @Field(<%- _v.bigType %>{ description: '<%= _v.desc %>' })
  <%- _v.transformerType %><%= _v.name %>: <%= toArrStr(_v) %>
  <% } }) %>
}
<% }) %>

//=================== 这里是 model ===================
@ObjectType({ description: '<%= desc %>' })
class Model {
  constructor() {
    // 这里可以初始化
  }
  <% data.basicList.map(_v=>{ %>
  <% _v.type = _v.type.replace("integer","number");if(_v.nullable){ %>
  @Field(<%- _v.bigType %>{ description: '<%= _v.desc %>', nullable: true })
  <%- _v.transformerType %><%= _v.name %>?: <%= toArrStr(_v) %>
  <% } else { %>
  @Field(<%- _v.bigType %>{ description: '<%= _v.desc %>' })
  <%- _v.transformerType %><%= _v.name %>: <%= toArrStr(_v) %>
  <% }}) %>
}

export default Model;

`