# 小小太阳系

一个面向儿童科普的 3D 太阳系互动演示应用。项目使用 Next.js、vinext、React Three Fiber 和 Three.js 构建，支持观察八大行星公转、自转、昼夜变化，以及日食和月食的几何关系。

## 功能亮点

- 3D 太阳系场景：展示太阳、八大行星、月球和主要轨道。
- 运动演示：可播放、暂停、重置行星公转和自转。
- 昼夜模式：观察地球自转、阳光照射和昼夜分界。
- 日食与月食模式：用简化模型演示太阳、地球、月球之间的遮挡关系。
- 可视化开关：可控制轨道、名称标签、运动箭头、阳光与影子、月球等辅助元素。
- 中文界面：适合课堂、亲子讲解和基础天文科普。

## 技术栈

- Next.js 16
- React 19
- React Three Fiber
- Drei
- Three.js
- Tailwind CSS
- vinext

## 环境要求

- Node.js `>=22.13.0`

## 本地运行

```bash
npm install
npm run dev
```

启动后根据终端输出打开本地地址即可预览。

## 常用命令

```bash
npm run dev
npm run build
npm test
npm run lint
```

- `npm run dev`：启动本地开发服务。
- `npm run build`：构建项目并验证 vinext 输出。
- `npm test`：先构建项目，再运行几何与渲染相关测试。
- `npm run lint`：运行 ESLint 检查。

## 项目结构

```text
app/
  SolarSystemApp.tsx      # 主要 3D 互动应用
  LightStream.tsx         # 光照可视化组件
  eclipseGeometry.ts      # 日食、月食几何计算
  planetOrbit.ts          # 行星轨道计算
  page.tsx                # 页面入口与分享元信息
  layout.tsx              # 页面布局与全局元信息
  globals.css             # 全局样式
public/
  favicon.svg             # 网站图标
  og.png                  # 分享预览图
tests/
  *.test.mjs              # 轨道、食相几何与渲染测试
```

## 访问方式

当前应用是公开的科普演示，不接入用户登录、鉴权或会话业务。部署配置中的 `.openai/hosting.json` 只保存站点项目和可选资源绑定信息。

## 部署

项目包含 Sites 部署配置：

```text
.openai/hosting.json
```

如需发布，先运行构建命令确认项目可以正常输出：

```bash
npm run build
```
