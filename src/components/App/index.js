import React, { useEffect } from 'react'
import './index.css'

import { Router } from '@reach/router'

import {
	whoami as query_whoami,
	sessions as query_sessions,
	accounts as query_accounts,
} from '../../queries.js'

// import categories from '../../data/dist/categories.json'
// import presets from '../../data/dist/presets.json'
// import colors from '../../data/dist/colors.json'
// import colorsByPreset from '../../data/dist/colorsByPreset.json'

import { /*Localized,*/ withLocalization } from '../Localized/'

import { withGlobals } from '../Globals/'

import { createMuiTheme, ThemeProvider, StylesProvider } from '@material-ui/core/styles';
// import { CssBaseline } from '@material-ui/core'

import {
	Card,
	CardContent,
	CardActions,

	Button,
	Typography,

	List,
	ListItem,
	ListItemText,
} from '@material-ui/core'
import {
	// AddRounded as AddIcon,
	// AddCircleRounded as AddCircleIcon,
	// ChevronRightRounded as ChevronRightIcon,
	// FilterList as FilterListIcon,
	// ExpandLess as ExpandLessIcon,
} from '@material-ui/icons'

// import 'typeface-roboto'

const defaultTheme = createMuiTheme({
	palette: {
		type: 'light',
		primary: {
			main: '#fff',
		},
		secondary: {
			main: '#000',
		},
		action: {
			active: '#000',
		},
		background: {
			paper: '#ffffff',
			default: '#f9f9f9',
		},
		tonalOffset: 0.05,
	},
})

function HandlePath(props) {
	const action = props.action || ''
	const docID = props.docID || ''
	const onPathChanged = props.onPathChanged

	useEffect(function(){
		if (!!onPathChanged) {
			onPathChanged({
				action,
				docID,
			})
		}
	}, [action, docID, onPathChanged])

	return null
}

class App extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			loading: true,

			profileID: false,
			sessions: [],
			accounts: [],

			doc: null,
			prefersDarkMode: false,

			theme: defaultTheme,

			isSmallScreen: false,

			action: '',
			docID: '',
		}

		this.functions = {}

		this.setTheme = this.setTheme.bind(this)

		this.check_color_scheme = this.check_color_scheme.bind(this)
		this.check_small_screen = this.check_small_screen.bind(this)

		this.onPathChanged = this.onPathChanged.bind(this)

		this.loadProfileID = this.loadProfileID.bind(this)
		this.loadSessions = this.loadSessions.bind(this)
		this.loadAccounts = this.loadAccounts.bind(this)
	}

	componentDidMount(){
		if (!!window.matchMedia) {
			// https://react-theming.github.io/create-mui-theme
			// https://material.io/resources/color/#!/?view.left=0&view.right=0&primary.color=FAFAFA&secondary.color=263238

			this.matcher_color_scheme = window.matchMedia('(prefers-color-scheme: dark)')
			this.matcher_color_scheme.addListener(this.check_color_scheme)
			this.check_color_scheme(this.matcher_color_scheme)

			this.matcher_small_screen = window.matchMedia('(min-width: 800px)')
			this.matcher_small_screen.addListener(this.check_small_screen)
			this.check_small_screen(this.matcher_small_screen)
		}else{
			this.setTheme(false)
		}

		this.loadProfileID()
	}
	componentWillUnmount(){
		if (!!window.matchMedia) {
			this.matcher_color_scheme.removeListener(this.check_color_scheme)
			this.matcher_small_screen.removeListener(this.check_small_screen)
		}
	}

	setTheme(prefersDarkMode){
		const background_paper = prefersDarkMode ? '#202020' : '#ffffff'
		const background_default = prefersDarkMode ? '#181818' : '#f9f9f9'

		const secondary_main = prefersDarkMode ? '#448aff' : '#2962ff' // A200_A700

		const error_main = prefersDarkMode ? '#f44' : '#e00'

		const theme = createMuiTheme({
			palette: {
				type: prefersDarkMode ? 'dark' : 'light',
				primary: {
					main: '#fff', // this.state.prefersDarkMode ? '#000' : '#fff' // '#fff'
				},
				secondary: {
					main: secondary_main,
				},
				action: {
					active: prefersDarkMode ? '#fff' : '#000',
				},
				background: {
					paper: background_paper,
					default: background_default,
				},
				error: {
					main: error_main,
				},
				tonalOffset: 0.05,
			},
			shape: {
				borderRadius: 8,
			},
			transitions: {
				duration: {
					complex: 200, // 375,
					enteringScreen: 200, // 225,
					leavingScreen: 200, // 195,
					short: 200, // 250,
					shorter: 200, // 200,
					shortest: 200, // 150,
					standard: 200, // 300,
				},
				easing: {
					easeIn: "ease", // "cubic-bezier(0.4, 0, 1, 1)",
					easeInOut: "ease", // "cubic-bezier(0.4, 0, 0.2, 1)"
					easeOut: "ease", // "cubic-bezier(0.0, 0, 0.2, 1)",
					sharp: "ease", // "cubic-bezier(0.4, 0, 0.6, 1)",
				},
			},
			overrides: {
				MuiLink: {
					root: {
						color: secondary_main,
					}
				},
				MuiFab: {
					root: {
						backgroundColor: background_paper,
						color: defaultTheme.palette.getContrastText(background_paper),
						transition: 'background-color 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
						'&:hover': {
							backgroundColor: background_default,
							color: defaultTheme.palette.getContrastText(background_paper),
						},
					},
					secondary: {
						backgroundColor: defaultTheme.palette.getContrastText(background_paper),
						color: background_paper,
						transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,background-color 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
						'&:hover': {
							opacity: 0.8,
							backgroundColor: defaultTheme.palette.getContrastText(background_paper),
							color: background_default,
						},
					},
				},
			},
		})

		this.setState({theme})
	}
	check_color_scheme(event){
		if(event.matches) {
			this.setTheme(true)
		} else {
			this.setTheme(false)
		}
	}
	check_small_screen(event){
		if (event.matches) {
			this.props.globals.isSmallScreen = false
		}else{
			this.props.globals.isSmallScreen = true
		}

		this.setState((state, props) => {
			if (this.props.globals.isSmallScreen !== state.isSmallScreen) {
				return {isSmallScreen: this.props.globals.isSmallScreen}
			}
			return undefined
		})

		// const viewport_width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
	}

	saveFunctions(componentName, functionsObject){
		this.functions[componentName] = functionsObject
	}

	setSearchBarValue(value){
		this.setState({searchBarValue:value})
	}

	onPathChanged(pathVars){
		this.setState(pathVars)
	}

	loadProfileID(){
		this.props.globals.graphql.query({
			fetchPolicy: 'no-cache',
			query: query_whoami,
		}).then(({data}) => {
			if (!!data && !!data.whoami) {
				this.setState({
					loading: false,
					profileID: data.whoami,
				})
				this.loadSessions()
				this.loadAccounts()
			}else{
				this.setState({
					loading: false,
					profileID: null,
				})
			}
		}).catch(error=>{
			console.error(error)
		})
	}

	loadSessions(){
		this.props.globals.graphql.query({
			fetchPolicy: 'no-cache',
			query: query_sessions,
		}).then(({data}) => {
			if (!!data && !!data.sessions) {
				this.setState({sessions: data.sessions})
			}else{
				this.setState({sessions: []})
			}
		}).catch(error=>{
			console.error(error)
		})
	}

	loadAccounts(){
		this.props.globals.graphql.query({
			fetchPolicy: 'no-cache',
			query: query_accounts,
		}).then(({data}) => {
			if (!!data && !!data.accounts) {
				this.setState({accounts: data.accounts})
			}else{
				this.setState({accounts: []})
			}
		}).catch(error=>{
			console.error(error)
		})
	}

	renderConnectButtons(){
		const account_iri_prefix = (
			this.props.globals.isDevEnvironment
			? `http://${this.props.globals.local_ip}:5000/qiekub/us-central1/auth/auth`
			: 'https://api.qiekub.org/auth'
		)

		return (<>
			<a href={account_iri_prefix+'/github/'}>
				<Button variant="contained">Connect with Github</Button>
			</a>
			<br />
			<br />
			<a href={account_iri_prefix+'/twitter/'}>
				<Button variant="contained">Connect with Twitter</Button>
			</a>
			<br />
			<br />
			<a href={account_iri_prefix+'/openstreetmap/'}>
				<Button variant="contained">Connect with OpenSteetMap</Button>
			</a>
		</>)
	}

	renderLogin(){
		return (<>
					<Card
						elevation={6}
						className="card"
					>
						<CardContent>
							<Typography gutterBottom variant="h5" component="h2">Login</Typography>
							<Typography variant="body2" color="textSecondary" component="p">
								Wenn du dich anmeldest wird ein Cookie namens "__session" in deinem Broswer gespeichert.
							<br />
							Dieser Cookie bleibt für 14 Tage bestehen. Somit bleibst du 14 Tage lang angemeldet. Immer wenn du die Seite neu aufrufst wird die Zeit bis zum automatischen Löschen des Cookies um 14 Tage verlängert.
							</Typography>

							<br />
							<br />
							{this.renderConnectButtons()}

						</CardContent>
					</Card>
		</>)
	}

	renderUserInfos(){
		const account_iri_prefix = (
			this.props.globals.isDevEnvironment
			? `http://${this.props.globals.local_ip}:5000/qiekub/us-central1/auth/auth`
			: 'https://api.qiekub.org/auth'
		)

		return (<>
					<Card
						elevation={6}
						className="card"
					>
						<CardContent>
							<Typography gutterBottom variant="h5" component="h2">Connected Accounts</Typography>
							<List>
							{
								this.state.accounts.map((account, index) => {
									console.log(account)
									return (
										<ListItem key={account._id}>
											<ListItemText
												primary={account.properties.provider}
												secondary={[account.properties.displayName, account.properties.username].filter(Boolean).map(v => (<div>{v}</div>))}
											/>
										</ListItem>
									)
								})
							}
							</List>

							<br />
							{this.renderConnectButtons()}
						</CardContent>
					</Card>
	
					<Card
						elevation={6}
						className="card"
					>
						<CardContent>
							<Typography gutterBottom variant="h5" component="h2">Sessions</Typography>
							<List>
							{
								this.state.sessions.map((session, index) => {
									return (
										<ListItem key={session._id}>
											<ListItemText
												primary={session.properties.user_agent}
												secondary={"Expires: "+session.properties.expires}
											/>
										</ListItem>
									)
								})
							}
							</List>
						</CardContent>
					</Card>
	
					<Card
						elevation={6}
						className="card"
					>
						<CardContent>
							<Typography gutterBottom variant="h5" component="h2">Logout</Typography>
							<Typography variant="body2" color="textSecondary" component="p">
								Wenn du dich ausloggst wird der Cookie "__session" von deinem Rechner gelöscht.
								<br />
								(Falls dies nicht passirt, dürfte das ein deinem Browser liegen. Schreib uns aber bitte. Vielleicht haben ja auch wir etwas falsch programmiert. Wird möchten immerhin dass du bei uns sicher bist!)
							</Typography>
						</CardContent>
						<CardActions style={{
							float: 'right',
						}}>
							<a href={account_iri_prefix+'/logout/'}>
								<Button size="small" color="primary">
									Logout
								</Button>
							</a>
						</CardActions>
					</Card>
		</>)
	}

	render() {
		if (this.state.loading) {
			return null
		}

		return (<>
			<ThemeProvider theme={this.state.theme}>
			<StylesProvider injectFirst>

			<Router primary={false}>
				<HandlePath
					path="/:action/*docID"
					onPathChanged={this.onPathChanged}
				/>
				<HandlePath
					path="/"
					onPathChanged={this.onPathChanged}
				/>
			</Router>


			<div
				style={{
					position: 'fixed',
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					overflow: 'auto',
					backgroundColor: this.state.theme.palette.background.default,
					textAlign: 'center',
				}}
			>
				<div style={{display: 'inline-block'}}>
					{
						!(!!this.state.profileID)
						? this.renderLogin()
						: this.renderUserInfos()
					}
				</div>
			</div>

		</StylesProvider>
		</ThemeProvider>
		</>)
	}
}

export default withGlobals(withLocalization(App))
