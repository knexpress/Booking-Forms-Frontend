import React from 'react'

interface Props {
	children: React.ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('UI Error:', error, info)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="p-8">
					<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
						<p className="text-red-700 font-semibold">Something went wrong.</p>
						<p className="text-sm text-red-600 mt-1">Please go back and try again.</p>
					</div>
				</div>
			)
		}
		return this.props.children
	}
}
