import { createBrowserRouter } from 'react-router-dom'
import React from 'react'
import { MainLayout } from '@/components/layout'

// 页面组件（懒加载）
const AIDoctor = React.lazy(() => import('@/pages/AIDoctor'))
const Search = React.lazy(() => import('@/pages/Search'))
const Write = React.lazy(() => import('@/pages/Write'))
const KBManage = React.lazy(() => import('@/pages/KBManage'))
const Pipeline = React.lazy(() => import('@/pages/Pipeline'))
const Annotation = React.lazy(() => import('@/pages/Annotation'))
const Enhance = React.lazy(() => import('@/pages/Enhance'))
const Flywheel = React.lazy(() => import('@/pages/Flywheel'))
const Template = React.lazy(() => import('@/pages/Template'))
const Graph = React.lazy(() => import('@/pages/Graph'))
const Analytics = React.lazy(() => import('@/pages/Analytics'))

// 加载中组件
const Loading = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-slate-400">加载中...</div>
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<Loading />}>
            <AIDoctor />
          </React.Suspense>
        ),
      },
      {
        path: 'ai-doctor',
        element: (
          <React.Suspense fallback={<Loading />}>
            <AIDoctor />
          </React.Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Search />
          </React.Suspense>
        ),
      },
      {
        path: 'write',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Write />
          </React.Suspense>
        ),
      },
      {
        path: 'kb',
        element: (
          <React.Suspense fallback={<Loading />}>
            <KBManage />
          </React.Suspense>
        ),
      },
      {
        path: 'pipeline',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Pipeline />
          </React.Suspense>
        ),
      },
      {
        path: 'annotation',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Annotation />
          </React.Suspense>
        ),
      },
      {
        path: 'enhance',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Enhance />
          </React.Suspense>
        ),
      },
      {
        path: 'flywheel',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Flywheel />
          </React.Suspense>
        ),
      },
      {
        path: 'template',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Template />
          </React.Suspense>
        ),
      },
      {
        path: 'graph',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Graph />
          </React.Suspense>
        ),
      },
      {
        path: 'analytics',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Analytics />
          </React.Suspense>
        ),
      },
    ],
  },
])