const React = require('react');

const { Button, Checkbox, Input, Radio, Modal, InputNumber, Alert } = require('antd');
const CheckboxGroup = Checkbox.Group;
const { remote } = require("electron");

const path = require('path');
const fs = require("fs");
var _ = require('lodash');
const { dir } = require('console');
const { TextArea } = Input;
const packageLockFileName = 'package-lock.json';
const packageFileName = 'package.json';
//需动态修改的长期配置，从磁盘缓存中读取配置文件
const configRootDir = "./config";//配置文件根目录
const appLockDir = configRootDir + "/appConfig.lock"//默认配置文件
const buzLockDir = configRootDir + "/buzConfig.lock"//业务包配置文件
const outputZipNameNeedCount = true//输出文件是否需要打包次数参数

let curBinDirName = __dirname;

//1 bin 2 0.58 0.59 3 demo
class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      platform: 'android',//平台 android iOS
      env: 'false',//环境 release debug
      entry: "",//打包入口
      baseIndexJsDir: "/platformDep-ui.js",//base包路径
      buzIndexJsDir: "/XABageIndex.js",//业务包入口路径
      buzConfigList: [],//业务包配置列表
      rootDir: "",//项目目录
      outputDir: "",//打包输出目录
      type: 'buz',//基础包:base 业务包:buz
      bundleDir: "/RNClass/output/XABadgeHome",//打包后bundle目录
      bundleName: "XABadgeHomeScreen",//bundle名
      assetsDir: "/RNClass/output/XABadgeHome",
      deps: [],//
      depsChecked: [],
      cmdStr: '',
      buzSelectItem: undefined,//业务包选中
      loading: false,
      buzEditModelVisible: 0,
      buzEditConfigTemp: { delCount: 0, entry: "", label: "" }//修改时的临时数据
    };
    this.onDepCheckChange = this.onDepCheckChange.bind(this);
    this.selectFile = this.selectFile.bind(this);
    this.renderFileSelect = this.renderFileSelect.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.render = this.render.bind(this);
    this.renderPlatformSelect = this.renderPlatformSelect.bind(this);
    this.renderEnvSelect = this.renderEnvSelect.bind(this);
    this.fileSelected = this.fileSelected.bind(this);
    this.renderTypeSelect = this.renderTypeSelect.bind(this);
    this.startPackage = this.startPackage.bind(this);
    this.initDir = this.initDir.bind(this);
  }
  renderBuzSelectItems() {
    return (<Radio.Group defaultValue={this.state.buzSelectItem} buttonStyle="solid"
      onChange={(e) => {
        this.setState({ buzSelectItem: e.target.value, entry: this.state.buzConfigList[e.target.value].entry });
      }}> {
        this.state.buzConfigList.map((item, index) => {
          if (index == 0) {
            if (this.state.buzSelectItem == undefined) {
              this.setState({ buzSelectItem: 0, entry: this.state.buzConfigList[0].entry });
            }
          }
          return <Radio.Button value={"" + index} key={index} checked={this.state.buzSelectItem == index}>{item.label}</Radio.Button>
        })
      }
    </Radio.Group>);


  }
  renderBuzList() {
    if (this.state.type == 'buz') {
      return (<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '12px' }}>
        <div style={{ marginRight: '10px' }}>{"业务包列表" + ' :  '}</div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>{this.renderBuzSelectItems()}</div>
        {
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Button style={{ marginRight: '10px', marginLeft: '10px' }} onClick={() => {
              this.openBuzAddModel(1)
            }}>{"新增"}</Button>
            {
              this.state.buzSelectItem != undefined ?
                <Button style={{ marginRight: '10px', marginLeft: '10px' }} onClick={() => {
                  this.openBuzAddModel(2)
                }}>{"编辑"}</Button> : null
            }
          </div>
        }

      </div>)
    }
  }
  openBuzAddModel(visibleType) {
    if (visibleType == 1) {
      this.state.buzEditConfigTemp = {
        title: "新增业务包", delCount: 0, entry: "", label: "", footer: [
          <Button key="back" onClick={() => {
            this.setState({ buzEditModelVisible: 0 })
          }}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={() => {
            if (this.state.buzEditConfigTemp.label <= 0) {
              Modal.warning({
                title: 'Warning',
                content: '必须输入业务名',
              });
              return
            } else if (this.state.buzEditConfigTemp.entry <= 0) {
              Modal.warning({
                title: 'Warning',
                content: '必须选择入口文件',
              });
              return
            }
            //构建数据，保存到内存与磁盘中
            this.state.buzConfigList.push({ label: this.state.buzEditConfigTemp.label, entry: this.state.buzEditConfigTemp.entry, delCount: this.state.buzEditConfigTemp.delCount })
            fs.writeFileSync(buzLockDir, JSON.stringify(this.state.buzConfigList));
            this.setState({ buzEditModelVisible: 0 })
          }}>
            添加
          </Button>]
      }
    } else if (visibleType == 2) {
      let c = this.state.buzConfigList[this.state.buzSelectItem]
      this.state.buzEditConfigTemp = {
        title: "修改业务包", delCount: c.delCount, entry: c.entry, label: c.label, isShowDeleteToast: false, footer: [
          <Button key="back" onClick={() => {
            this.setState({ buzEditModelVisible: 0 })
          }}>
            取消
          </Button>,
          <Button style={{ background: "red", borderColor: "red", color: "white" }} onClick={() => {
            if (this.state.buzEditConfigTemp.isShowDeleteToast == false) {
              this.state.buzEditConfigTemp.isShowDeleteToast = true
              Modal.warning({
                title: 'Warning',
                content: '此按钮点击将立即删除，请确认无误后点击',
              });
              return
            }
            this.state.buzConfigList.splice(this.state.buzSelectItem, 1)
            fs.writeFileSync(buzLockDir, JSON.stringify(this.state.buzConfigList));
            this.state.buzSelectItem = 0
            this.setState({ buzEditModelVisible: 0 })
          }} danger>
            删除
          </Button>,
          <Button key="submit" type="primary" onClick={() => {
            if (this.state.buzEditConfigTemp.label <= 0) {
              Modal.warning({
                title: 'Warning',
                content: '必须输入业务名',
              });
              return
            } else if (this.state.buzEditConfigTemp.entry <= 0) {
              Modal.warning({
                title: 'Warning',
                content: '必须选择入口文件',
              });
              return
            }
            //构建数据，保存到内存与磁盘中
            c.label = this.state.buzEditConfigTemp.label
            c.entry = this.state.buzEditConfigTemp.entry
            c.delCount = this.state.buzEditConfigTemp.delCount
            fs.writeFileSync(buzLockDir, JSON.stringify(this.state.buzConfigList));
            this.setState({ buzEditModelVisible: 0 })
          }}>
            确认修改
          </Button>]
      }
    }
    this.setState({ buzEditModelVisible: visibleType })
  }

  componentDidMount() {
    //检查本地配置文件，至少需要业务包目录
    console.log("componentDidMount:" + this.state.rootDir)
    this.checkConfig()

  }
  checkConfig() {
    this.checkAppConfig()
  }
  checkConfigNext() {
    console.log("this.state.rootDir:" + this.state.rootDir)
    console.log("this.state.outputDir:" + this.state.outputDir)
    if (this.state.rootDir.length <= 0) {
      this.openSelectDirDialog("请选择RN工程目录", 1)
      return
    }
    if (this.state.outputDir.length <= 0) {
      this.openSelectDirDialog("请选择打包输出目录", 2)
      return
    }
    this.checkBuzConfig()

  }
  openSelectDirDialog(title, type) {
    let openType = 'openDirectory';
    let filter = undefined;
    remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      {
        defaultPath: curBinDirName,
        title: title,
        buttonLabel: '选择',
        filters: filter,
        properties: [openType]
      },
      (filePath) => {
        if (filePath) {
          const directory = filePath[0];
          console.log("选择文件type:" + type)
          if (type == 1) {

            this.setState({ rootDir: directory });
            fs.writeFileSync(appLockDir, this.createAppConfigStr(), 'utf8')
          } else if (type == 2) {

            this.setState({ outputDir: directory });
            fs.writeFileSync(appLockDir, this.createAppConfigStr(), 'utf8')
          }
          this.checkConfigNext()
        }
      }
    )
  }
  createAppConfigStr() {
    return JSON.stringify({ rootDir: this.state.rootDir, outputDir: this.state.outputDir })
  }

  //检查基础配置
  checkAppConfig() {
    console.log("checkAppConfig:" + this.state.rootDir)
    fs.readFile(appLockDir, 'utf8', (err, fileContent) => {
      console.log("readFile:" + err)
      if (err) {
        if (err.code === 'ENOENT') {
          return
        }
        throw new Error(err)
      }
      //读取到json
      const content = JSON.parse(fileContent);
      let rootDir = content['rootDir'];
      let outputDir = content['outputDir'];

      //将数据添加到内存缓存
      this.setState({ rootDir: rootDir, outputDir: outputDir })
      if (outputDir.length <= 0 || rootDir <= 0) {
        //需要先设置基础路径

      } else {
        //检查通过，执行后续逻辑
      }
      this.checkConfigNext()
    });
  }
  //检查业务包配置
  checkBuzConfig() {
    fs.readFile(buzLockDir, 'utf8', (err, fileContent) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return
        }
        throw new Error(err)
      }
      //读取到json
      const content = JSON.parse(fileContent);
      this.setState({ buzConfigList: content })
      this.initDir(this.state.rootDir);
    });
  }

  initDir(curDir) {
    //load lock.json
    //const curDir = curBinDirName;
    console.log('curDir', path.dirname(curDir));
    let dirTmp = curDir;
    while (dirTmp.length > 2) {
      console.log('curDir', dirTmp);
      let packageLockFile = path.join(dirTmp, packageLockFileName);
      let packageJsonFile = path.join(dirTmp, packageFileName);
      if (fs.existsSync(packageLockFile)) {
        console.log('package-lock.json', packageLockFile);
        this.projDir = dirTmp;//要分包的项目目录
        this.projPackageDir = dirTmp;
        this.packageFilePath = packageJsonFile;//packageJson
        this.packageFileLockPath = packageLockFile;
        break;
      }
      dirTmp = path.dirname(dirTmp);
    }
    console.log('projDir', this.projDir);
    if (this.packageFilePath != null) {
      //   this.setState({ entry: this.projPackageDir + path.sep + 'platformDep-ui.js' });
      fs.readFile(this.packageFilePath, 'utf8', (err, fileContent) => {
        if (err) {
          if (err.code === 'ENOENT') {
            return
          }
          throw new Error(err)
        }

        const content = JSON.parse(fileContent);
        let deps = content['dependencies'];
        this.depsStrs = Object.keys(deps);
        let depsArray = Object.keys(deps);
        for (let i = 0; i < depsArray.length; i++) {
          let depStr = depsArray[i];
          if (depStr == 'react' || depStr == 'react-native') {
            depsArray[i] = { value: depStr, label: depStr, check: true, disabled: true };
          }
        }
        this.setState({ deps: depsArray });
        console.log('package json content', content);
      });
    } else {
      alert('请在先在目标工程执行npm install再进入程序，或者选择正确的工程目录');
    }
    const fixPath = require('fix-path');
    fixPath();
  }


  renderItem(name, item) {
    return (<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '12px' }}>
      <div style={{ marginRight: '10px' }}>{name + ' :  '}</div>
      <div style={{ display: 'flex', flexDirection: 'row' }}>{item}</div>
    </div>)
  }


  renderPlatformSelect() {
    return (<Radio.Group defaultValue="android" buttonStyle="solid"
      onChange={(e) => {
        console.log('renderPlatformSelect', e.target.value);
        this.setState({ platform: e.target.value });
      }
      }>
      <Radio.Button value="android">Android</Radio.Button>
      <Radio.Button value="ios">iOS</Radio.Button>
    </Radio.Group>);
  }
  renderEnvSelect() {
    return (<Radio.Group defaultValue="false" buttonStyle="solid"
      onChange={(e) => {
        console.log('renderEnvSelect', e);
        this.setState({ env: e.target.value });
      }}>
      <Radio.Button value="false">Release</Radio.Button>
      <Radio.Button value="true">Debug</Radio.Button>
    </Radio.Group>);
  }
  renderTypeSelect() {
    return (<Radio.Group defaultValue={this.state.type} buttonStyle="solid"
      onChange={(e) => {
        console.log('renderEnvSelect', e);
        this.setState({ type: e.target.value });
        if (e.target.value == 'base') {
          this.setState({ entry: this.state.rootDir + "\\platformDep-ui.js" });
        } else {
          this.setState({ entry: this.state.buzConfigList[this.state.buzSelectItem].entry });
        }
      }}
    >
      <Radio.Button value="base">基础包</Radio.Button>
      <Radio.Button value="buz">业务包</Radio.Button>
    </Radio.Group>);
  }
  renderFileSelect(id) {
    let buttonName = '选择目录';
    if (id == 'entry') {//file
      buttonName = '选择文件';
      if (this.state.entry) {
        buttonName = this.state.entry;
      }
    } else if (id == 'bundle') {
      if (this.state.bundleDir) {
        buttonName = this.state.bundleDir;
      }
    } else if (id == 'assets') {
      if (this.state.assetsDir) {
        buttonName = this.state.assetsDir;
      }
    }
    return (<Button onClick={_ => this.selectFile(id)} block>{buttonName}</Button>);
  }

  fileSelected(id, path) {
    if (id == 'entry') {//file
      this.setState({ entry: path });
    } else if (id == 'bundle') {
      this.setState({ bundleDir: path });
    } else if (id == 'assets') {
      this.setState({ assetsDir: path });
    }
  }

  selectFile(id) {
    let openType = 'openDirectory';
    let title = '选择';
    let filter = undefined;
    if (id == 'entry') {
      openType = 'openFile';
      title = '打包入口文件选择';
      filter = [
        {
          extensions: ['js']
        }
      ]
    } else if (id == 'bundle') {
      title = '打包bundle目录选择';
    } else if (id == 'assets') {
      title = '打包资源目录选择';
    }
    console.log('projDir', this.projDir);
    remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      {
        defaultPath: this.projDir,
        title: title,
        buttonLabel: '选择',
        filters: filter,
        properties: [openType]
      },
      (filePath) => {
        if (filePath) {
          const directory = filePath[0];
          this.fileSelected(id, directory);
        }
      }
    )
  }

  onDepCheckChange(e) {
    const { type } = this.state;
    if (type == 'buz') {
      e = e.filter((value) => !(value == 'react' || value == 'react-native'));
    }
    console.log('onDepCheckChange', e);
    this.setState({ depsChecked: e });
  }

  renderDep() {
    const { deps, depsChecked, type } = this.state;
    let options = deps;
    var defaultChecked = ['react', 'react-native'];
    if (type == 'buz') {//业务包不可能把react打进去
      options = options.filter((value) => !(value == 'react' || value == 'react-native'
        || value.value == 'react' || value.value == 'react-native'));
      defaultChecked = options;
      this.state.depsChecked = defaultChecked
    } else {
      //移除错误配置
      options = options.filter((value) => !(value == 'react' || value == 'react-native'
        || value.value == 'react' || value.value == 'react-native'));
      //添加所有配置和react
      defaultChecked.push.apply(defaultChecked, options)
      //将配置重置
      options = deps
      //将选中项更新到state状态机中
      this.state.depsChecked = defaultChecked
    }
    return <CheckboxGroup key={defaultChecked} options={options} onChange={this.onDepCheckChange} defaultValue={defaultChecked} />
  }

  getAllDeps(platformDepArray, lockDeps) {
    let allPlatformDep = [];
    let travelStack = platformDepArray;
    while (travelStack.length != 0) {
      let depItem = travelStack.pop();
      allPlatformDep.push(depItem);
      console.log('depItem', depItem);
      let depDetail = lockDeps[depItem];
      if (depDetail == null) {
        console.log('depItem no found', depItem);
        continue;
      }
      let depReq = depDetail['requires'];
      if (depReq != null) {
        travelStack = travelStack.concat(_.difference(Object.keys(depReq), allPlatformDep));//difference防止循环依赖
      }
    }
    return _.uniq(allPlatformDep);
  }
  deldirs(dirpath) {
    var stat = null,
      emptyFoldersArr = [];

    function scan(spath) {
      console.log("scan" + spath)
      var files = fs.readdirSync(spath);
      emptyFoldersArr.push(spath);
      if (files.length > 0) {
        files.forEach((file, idx, arr) => {
          if (fs.statSync(spath + '/' + file).isDirectory()) {
            scan(spath + '/' + file);
          } else {
            return fs.unlinkSync(spath + '/' + file), !0;
          }
        });
      }
    }
    try {
      fs.accessSync(dirpath, fs.constants.F_OK);
      scan(dirpath);
      for (var l = emptyFoldersArr.length - 1, i = l; i >= 0; i--) {
        console.log("rmdirSync：" + emptyFoldersArr[i])
        fs.rmdirSync(emptyFoldersArr[i]);
      }
    } catch (e) {

    }


  }

  startPackage() {
    this.setState({ cmdStr: '' });
    const { exec } = require('child_process');
    const { platform, env, entry, type, depsChecked, outputDir } = this.state;
    let isBuz = type == "buz"
    let outputDirTemp = outputDir + (isBuz ? "\\temp" : "\\base")
    this.deldirs(outputDirTemp)
    fs.mkdir(outputDirTemp, (err) => {
      console.log("创建文件夹：" + err)
    })

    let bundleName = type + ".bundle" //输出的bundle名，后续构建config.json需要
    var outputZipFile = ""
    if (isBuz) {
      //业务包才需

      let spa = this.state.buzConfigList[this.state.buzSelectItem].entry.split(".")[0].split("/")
      console.log("spa:" + spa)
      let spa2 = spa[spa.length - 1].split("\\")
      let outputZipName = spa2[spa2.length - 1]
      if (outputZipNameNeedCount) {
        //需要打包次数后缀输出，删除旧的

        let currentCount = this.state.buzConfigList[this.state.buzSelectItem].delCount
        try {
          fs.unlinkSync(outputDir + "\\" + outputZipName + (Array(3).join("0") + (currentCount)).slice(-3) + ".zip");
        } catch (e) {
          console.log("rme:" + e)
        }
        let nextCount = (Array(3).join("0") + (currentCount + 1)).slice(-3);
        outputZipName = outputZipName + nextCount
        console.log("zipAppend:" + currentCount + " " + outputZipName)

      }
      outputZipFile = outputDir + "\\" + outputZipName + ".zip"
    }
    console.log('bundleName', bundleName
      , 'platform', platform, 'env', env, 'entry', entry, 'type', type
      , 'depsChecked', depsChecked);
    if (entry == null) {
      alert("请选择打包的js入口");
      return;
    }

    let bundleConifgName;
    let platformDepJsonPath = this.projPackageDir + path.sep + 'platformDep.json';
    if (type == 'base') {
      bundleConifgName = 'platform-ui.config.js';
      fs.writeFileSync(platformDepJsonPath, JSON.stringify(depsChecked));
      let platformDepImportPath = this.projPackageDir + path.sep + 'platformDep-import.js';
      let importStr = '';
      depsChecked.forEach((moduleStr) => {
        importStr = importStr + 'import \'' + moduleStr + '\'\n';
      });
      fs.writeFileSync(platformDepImportPath, importStr);
    } else {
      bundleConifgName = 'buz-ui.config.js';
      const platformDepArray = require(platformDepJsonPath);
      if (!Array.isArray(platformDepArray)) {
        alert("必须先打基础包");
        return;//必须先打基础包
      }
      if (depsChecked.length > 0) {//需要过滤platformDepArray
        const packageLockObj = require(this.packageFileLockPath);
        const lockDeps = packageLockObj['dependencies'];
        console.log('start deal platform dep');
        let allPlatformDep = this.getAllDeps(platformDepArray, lockDeps);
        console.log('start deal buz dep');
        let allBuzDep = this.getAllDeps(depsChecked, lockDeps);
        let filteredBuzDep = _.difference(allBuzDep, allPlatformDep);
        let buzDepJsonPath = this.projPackageDir + path.sep + 'buzDep.json';//业务包依赖的路径
        fs.writeFileSync(buzDepJsonPath, JSON.stringify(filteredBuzDep));//todo 打包脚本读取该数组
      }
    }
    let cmdStr = 'node ./node_modules/react-native/local-cli/cli.js bundle  --platform ' + platform
      + ' --dev ' + env + ' --entry-file ' + entry + ' --bundle-output ' + outputDirTemp + path.sep + bundleName
      + ' --assets-dest ' + outputDirTemp + ' --config ' + this.projPackageDir + path.sep + bundleConifgName;
    this.setState({ loading: true });
    let packageProcess = exec(cmdStr, { cwd: this.projDir }, (error, stdout, stderr) => {
      this.setState({ loading: false });
      if (error) {
        console.error(`执行出错: ${error}`);
        this.setState({ cmdStr: error });
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      if (isBuz) {
        //打包到临时文件夹执行成功
        //查询入口文件，获取注册的入口名称
        var data = fs.readFileSync(entry, { encoding: 'utf8', flag: 'r' });
        var modelName = data.split("AppRegistry.registerComponent(")[1].split(",")[0].replace(/"|'/g, "")
        //进行config创建
        fs.writeFileSync(outputDirTemp + "\\config.json", JSON.stringify({ bundleName: bundleName, modelName: modelName }));
        //压缩zip
        const cmdzipstr = "7z a -tzip " + outputZipFile + " " + outputDirTemp + "\\*"

        exec(cmdzipstr, { cwd: this.projDir }, (error, stdout, stderr) => {
          if (error) {
            console.error(`执行出错: ${error}`);
            this.setState({ cmdStr: error });
            return;
          }
          //删除临时文件夹
          this.deldirs(outputDirTemp)
          //增加打包次数
          this.state.buzConfigList[this.state.buzSelectItem].delCount++
          fs.writeFileSync(buzLockDir, JSON.stringify(this.state.buzConfigList));
          console.log(`压缩打包成功！！！`);
        })
      }
    });
    packageProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      let cmdRetStrs = data + this.state.cmdStr;
      this.setState({ cmdStr: cmdRetStrs });
    });
  }

  render() {
    const { platform, env, entry, type, bundleDir, assetsDir, depsChecked } = this.state;
    return (<div style={{ paddingLeft: 30, paddingTop: 18, display: 'flex', flexDirection: 'column' }}>
      {this.renderItem('平台', this.renderPlatformSelect())}
      {this.renderItem('环境', this.renderEnvSelect())}
      {this.renderItem('类型', this.renderTypeSelect())}
      {this.renderBuzList()}
      {this.renderItem('入口', this.renderFileSelect('entry'))}
      {/* {this.renderItem('bundle目录', this.renderFileSelect('bundle'))}
      {this.renderItem('bundle名称', this.renderBundleName())}
      {this.renderItem('assets目录', this.renderFileSelect('assets'))} */}
      {this.renderItem('模块依赖', this.renderDep())}
      <Button style={{ marginTop: 12, marginLeft: 10, width: 100 }} loading={this.state.loading} onClick={this.startPackage}>打包</Button>
      <TextArea value={this.state.cmdStr} rows={4} readonly={true} style={{ marginTop: 12, width: 800, height: 200 }} />
      {
        this.renderAddModal()
      }
    </div>);
  }


  renderAddModal() {

    const { buzEditConfigTemp } = this.state
    return <Modal
      visible={this.state.buzEditModelVisible != 0}
      title={buzEditConfigTemp.title}
      footer={buzEditConfigTemp.footer}
      onOk={() => { this.setState({ buzEditModelVisible: 0 }) }}
      onCancel={() => { this.setState({ buzEditModelVisible: 0 }) }}

    >
      {
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {this.renderItem('业务包名称', <Input defaultValue={"请输入业务包名称"} value={buzEditConfigTemp.label} onChange={(res) => {
            buzEditConfigTemp.label = res.target.value
            this.setState({ buzEditConfigTemp: buzEditConfigTemp })
          }} />)}
          {this.renderItem('入口文件', <Button onClick={() => {
            remote.dialog.showOpenDialog(
              remote.getCurrentWindow(),
              {
                defaultPath: this.state.rootDir,
                title: "请选择业务包入口",
                buttonLabel: '选择',
                filters: { extensions: ['js'] },
                properties: ['openFile']
              },
              (filePath) => {
                if (filePath) {
                  const directory = filePath[0];
                  buzEditConfigTemp.entry = directory
                  this.setState({ buzEditConfigTemp: buzEditConfigTemp })
                }
              }
            )
          }} >{buzEditConfigTemp.entry ? buzEditConfigTemp.entry : "选择入口"}</Button>)}
          {this.renderItem('打包次数', <InputNumber min={0} max={999} value={buzEditConfigTemp.delCount} defaultValue={0} onChange={(res) => {
            buzEditConfigTemp.delCount = res
            this.setState({ buzEditConfigTemp: buzEditConfigTemp })
          }} />)}
        </div>
      }

    </Modal>
  }
}

module.exports = App;
