# 小小科学馆

一个面向儿童科普的互动科学项目集合。首页作为统一展厅入口，当前开放“小小太阳系”，后续可以继续加入火山、水循环、台风等自然科学动画。

## 当前内容

- 小小太阳系：3D 展示太阳、八大行星和月球，支持公转、自转、昼夜、日食和月食互动演示。
- 火山的形成：即将上线。
- 水循环：即将上线。
- 台风的形成：即将上线。

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

## 项目结构

```text
app/
  page.tsx                         # 小小科学馆导航首页
  ProjectCard.tsx                  # 统一项目卡片
  projectCatalog.ts                # 项目清单与状态类型
  home.css                         # 导航页样式与 CSS 科普插画
  projects/
    solar-system/
      page.tsx                     # 太阳系子项目路由
      SolarSystemApp.tsx           # 3D 互动应用
      LightStream.tsx              # 光照可视化
      eclipseGeometry.ts           # 日食、月食几何计算
      planetOrbit.ts               # 行星轨道计算
public/
  favicon.svg                      # 网站图标
  og.png                           # 小小科学馆分享图
  solar-system-og.png              # 小小太阳系分享图
tests/
  *.test.mjs                       # 路由渲染、轨道和食相测试
```

## 新增项目

1. 在 `app/projectCatalog.ts` 登记项目标题、分类、简介、状态和视觉标识。
2. 将开放项目设置为 `available` 并提供 `href`；未开放项目使用 `coming-soon`，类型会禁止误配入口地址。
3. 在 `app/projects/<slug>/page.tsx` 创建对应的互动页面。

## 访问方式

当前站点为公开科普演示，不接入登录、鉴权、数据库或会话业务。部署配置中的 `.openai/hosting.json` 只保存 Sites 项目和可选资源绑定信息。
