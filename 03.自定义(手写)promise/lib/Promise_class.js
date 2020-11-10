/*
  自定义 Promise 函数模块
*/
// IIFE 立即执行匿名函数自调用
(function (params) {
  const PENDING = "pending"
  const RESOLVED = "resolved"
  const REJECTED = "rejected"
  class Promise {
    /**
     * Promise 构造函数
     * @param executor 执行器函数（同步执行）
     * @constructor
     */
    constructor(executor) {
      const self = this // 将当前promise对象保存起来
      this.status = PENDING // 给 promise 对象指定 status 属性，初始值为 PENDING
      this.data = undefined // 给 promise 对象指定一个用于存储结果数据的属性
      this.callbacks = [] // 每个元素的结构：{ onResolved() {}, onRejected() {} }
      function resolve(value) {
        // 如果当前状态不是 PENDING ，直接结束
        if (self.status !== PENDING) return
        // 将状态改为 RESOLVED
        self.status = RESOLVED
        // 保存 value 数据
        self.data = value
        // 如果有待执行的 callback 函数，立即异步执行回调onResolved
        if (self.callbacks.length > 0) {
          setTimeout(()=>{ // 放入队列中执行成功的回调
            self.callbacks.forEach(callbacksObj => {
              callbacksObj.onResolved(value)
            })
          })
        }
      }
      function reject(reason) {
        // 如果当前状态不是 PENDING ，直接结束
        if (self.status !== PENDING) return
        // 将状态改为 REJECTED
        self.status = REJECTED
        // 保存 value 数据
        self.data = reason
        // 如果有待执行的 callback 函数，立即异步执行回调onRejected
        if (self.callbacks.length > 0) {
          setTimeout(()=>{ // 放入队列中执行成功的回调
            self.callbacks.forEach(callbacksObj => {
              callbacksObj.onRejected(reason)
            })
          })
        }
      }
      // 立即同步执行 executor
      try {
        executor(resolve, reject)
      } catch (error) { // 如果执行器抛出异常， promise对象变为 REJECTED 状态
        reject(error)
      }
    }
    /*
    Promise 原型对象的 then()
    指定成功和失败的回调函数
    返回一个新的 promise 对象
    返回promise的结果由onResolved/onRejected执行结果决定
   */
    then(onResolved, onRejected) {
      const self = this
      // 指定回调函数的默认值
      onResolved = typeof onResolved === "function" ? onResolved : value => value
      onRejected = typeof onRejected === "function" ? onRejected : reason => { throw reason }
      return new Promise((resolve, reject)=>{
        // 执行指定的回调函数，根据执行的结果，改变return的promise的状态
        function handle(callback) {
          /*
            返回promise的结果由onResolved/onRejected执行结果决定:
            1. 如果抛出异常，return 的 promise 就会失败，reason 就是 error
            2. 如果回调函数返回不是 promise， return 的 promise 就会成功，value 就是返回的值
            3. 如果回调函数返回是 promise， return 的 promise 的结果就是这个promise的结果
           */
          try {
            const result = callback(self.data)
            if (result instanceof Promise) { // 3.如果回调函数返回是 promise， return 的 promise 的结果就是这个promise的结果
              result.then(resolve, reject)
            } else { // 2.如果回调函数返回不是 promise， return 的 promise 就会成功，value 就是返回的值
              resolve(result)
            }
          } catch (error) { // 1.如果抛出异常，return 的 promise 就会失败，reason 就是 error
            reject(error)
          }
        }

        if(self.status === RESOLVED) { // 当前 promise 的状态是 resolved
          // 立即异步执行成功的回调
          setTimeout(()=>{
            handle(onResolved)
          })
        } else if(self.status === REJECTED) { // 当前 promise 的状态是 rejected
          // 立即异步执行失败的回调
          setTimeout(()=>{
            handle(onRejected)
          })
        } else { // 当前 promise 的状态是 pending
          // 将成功和失败的回调函数保存到 callback 容器中缓存起来
          self.callbacks.push({
            onResolved () { handle(onResolved) },
            onRejected () { handle(onRejected) }
          })
        }
      })
    }
    /*
      Promise 原型对象的 catch()
      指定失败的回调函数
      返回一个新的 promise 对象
     */
    catch(onRejected) {
      return this.then(undefined, onRejected)
    }
    /*
      Promise 函数对象 resolve 方法
      返回一个指定结果的成功的promise
     */
    static resolve(value) {
      // 返回一个 成功 / 失败 的promise
      return new Promise((resolve, reject)=>{
        if (value instanceof Promise) { // value 是 promise  使用 value 的结果作为promise的结果
          value.then(resolve, reject)
        } else { // value 不是 promise
          resolve(value)
        }
      })
    }
    /*
      Promise 函数对象 reject 方法
      返回一个指定reason的失败的promise
     */
    static reject(reason) {
      // 返回一个失败的promise
      return new Promise((resolve, reject)=>{
        reject(reason)
      })
    }
    /*
      Promise 函数对象 all 方法
      返回一个promise，只有当所有 promise 都成功时才成功，否则只要有一个失败的就失败
     */
    static all(promises) {
      const values = new Array(promises.length) // 用来保存所有成功value的数组
      let resolvedCount = 0 // 用来保存已成功的promise的数量
      return new Promise((resolve, reject)=>{
        // 遍历promises获取每个promise的结果
        promises.forEach((p, index)=>{
          Promise.resolve(p).then(
              value => {
                resolvedCount++ // 成功的数量加1
                // p 成功，将成功的 value 保存到 values 数组
                values[index] = value
                // 如果全部成功了，将return的promise改变成功
                if(resolvedCount === promises.length) {
                  resolve(values)
                }
              },
              reason => { // 只要有一个失败了， return的promise就失败
                reject(reason)
              }
          )
        })
      })
    }
    /*
      Promise 函数对象 race 方法
      返回一个promise，其结果由第1个完成的promise决定
     */
    static race(promises) {
      // 返回一个 promise
      return new Promise((resolve, reject) => {
        // 遍历promises获取每个promise的结果
        promises.forEach((p, index)=>{
          Promise.resolve(p).then(
              value => { // 一旦有成功了，将return的promise变为成功
                resolve(value)
              },
              reason => { // 一旦有失败了，将return的promise变为失败
                reject(reason)
              }
          )
        })
      })
    }
    /**
     * 返回一个promise对象，它在指定的时间后才确定结果
     * @param value
     * @param time
     */
    static resolveDelay(value, time) {
      // 返回一个 成功 / 失败 的promise
      return new Promise((resolve, reject)=>{
        setTimeout(()=>{
          if (value instanceof Promise) { // value 是 promise  使用 value 的结果作为promise的结果
            value.then(resolve, reject)
          } else { // value 不是 promise
            resolve(value)
          }
        }, time)
      })
    }
    /**
     * 返回一个promise对象，它在指定的时间后才失败
     * @param value
     * @param time
     */
    static rejectedDelay(reason, time) {
      // 返回一个失败的promise
      return new Promise((resolve, reject)=>{
        setTimeout(()=>{
          reject(reason)
        }, time)
      })
    }
  }
  // 向外暴露 Promise 函数
  window.Promise = Promise
})()