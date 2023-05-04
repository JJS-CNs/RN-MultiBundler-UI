# RN-MultiBundler-UI
可视化的RN拆包工具

专门为react-native-multibundler开发的UI拆包工具，使用electron开发


使用方法：

1、安装electron

2、进入工程目录，npm install 或者 yarn install

3、运行程序，执行 npm run start

4、刚进入会弹出选择需要拆包的工程目录的弹框：

<img src="https://github.com/smallnew/RN-MultiBundler-UI/raw/master/readme/choose_proj_dialog.jpg" width="600" alt="choose_proj_dialog"></img>

5、根据需要选择打包参数：

<img src="https://github.com/smallnew/RN-MultiBundler-UI/raw/master/readme/packege_ui.jpg" width="600" alt="packege_ui"></img>

该拆包工具跟命令行打包最大的优势是：当业务包依赖一个大型的第三方库的时候，这个第三方库又依赖的其他的第三方库，UI打包工具能自动计算出所有需要打包进入的第三方库

# 打包阶段：项目实际选项在文件夹中：readme/微信截图_20230407161002.png

# 开发调试阶段：启动2个cmd窗口，并cd到RNModule目录；先yarn start启动服务。再启动adb reverse tcp:8081 tcp:8081
首次启动后，会自动生成config文件夹，和两个配置文件；
# appConfig.lock
- 它是一个jsonObject
- rootDir：项目目录绝对地址
- outputDir：打包输出的zip包绝对地址
- 例：{"rootDir":"E:\\Android\\other_worker\\RNModule","outputDir":"E:\\Android\\other_worker\\RNModule\\RNClass\\output"}
# buzConfig.lock
- 它是一个jsonArray
- label：业务名称（只用于展示）
- entry：打包入口（核心，不能错）
- delCount：打包次数（根据app.js中outputZipNameNeedCount开关，默认true生成的zip包会携带这个次数用于识别新旧包）
- 例：[{"label":"装扮模块","entry":"E:\\Android\\other_worker\\RNModule\\XABageIndex.js","delCount":13}]
请根据实际情况手动修改配置或者通过图形页面修改
# app.js
你可以修改的默认配置
- outputZipNameNeedCount = true//输出文件是否需要打包次数参数
- this.state.platform //平台 android iOS
- this.state.env //环境 release debug
- this.state.type //基础包:base 业务包:buz