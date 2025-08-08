// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import AuthProvider from './app/context/AuthProvider'
import { BracketPlayersProvider } from './app/context/BracketPlayersCtx'
import { BracketSettingsProvider } from './app/context/BracketSettingsCtx'
import { BracketThemeProvider } from './app/context/BracketThemeContext'

import { router } from './app/router'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BracketPlayersProvider>
                    <BracketSettingsProvider>
                        <BracketThemeProvider>
                            <RouterProvider router={router} />
                        </BracketThemeProvider>
                    </BracketSettingsProvider>
                </BracketPlayersProvider>
            </AuthProvider>
        </QueryClientProvider>
    </React.StrictMode>
)
