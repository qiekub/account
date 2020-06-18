import React, { useEffect } from 'react'
import './index.css'

import { Router, navigate } from '@reach/router'

import {
	whoami as query_whoami,
	loadSessions as query_loadSessions,
	loadAccounts as query_loadAccounts,
	loadChangesets as query_loadChangesets,
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
	Paper,
	AppBar,
	Tabs,
	Tab,

	Button,
	Typography,

	List,
	ListItem,
	ListItemText,

	Card,
	CardContent,
	// CardActions,

	Table,
	TableBody,
	TableRow,
	TableCell,
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

function TabPanel(props) {
	const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      style={{
      	position: 'relative',
      	width: '400px',
      	maxWidth: '100%',
      	margin: '0 auto',
      	padding: '32px',
      }}
      {...other}
    >
      {
      	value === index
      	? children
      	: null
      }
    </div>
  );
}

class App extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			loading: true,

			profileID: false,
			sessions: [],
			accounts: [],
			changesets: [],

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
		this.handleTabChange = this.handleTabChange.bind(this)

		this.loadProfileID = this.loadProfileID.bind(this)
		this.loadSessions = this.loadSessions.bind(this)
		this.loadAccounts = this.loadAccounts.bind(this)
		this.loadChangesets = this.loadChangesets.bind(this)
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

	handleTabChange(event, newValue){
		if (!!newValue) {
			navigate(`/${newValue}/`)
		}else{
			navigate(`/`)
		}
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
				this.loadChangesets()
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
			query: query_loadSessions,
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
			query: query_loadAccounts,
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

	loadChangesets(){
		this.props.globals.graphql.query({
			fetchPolicy: 'no-cache',
			query: query_loadChangesets,
		}).then(({data}) => {
			console.log('in-loadChangesets', data)
			if (!!data && !!data.changesets) {
				this.setState({changesets: data.changesets})
			}else{
				this.setState({changesets: []})
			}
		}).catch(error=>{
			console.error(error)
		})
	}

	render() {
		if (this.state.loading) {
			return null
		}

		const action = this.state.action

		const account_iri_prefix = (
			this.props.globals.isDevEnvironment
			? `http://${this.props.globals.local_ip}:5000/qiekub/us-central1/api/auth`
			: 'https://api.qiekub.org/auth'
		)

		if (!(!!this.state.profileID)) {
			return (
				<ThemeProvider theme={this.state.theme}>
				<StylesProvider injectFirst>
					<Paper
						style={{
							position: 'fixed',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							textAlign: 'center',
							overflow: 'auto',
							backgroundColor: this.state.theme.palette.background.default,
						}}
					>
						<br />
						<br />
						<br />
						<a href={account_iri_prefix+'/github/'}>
							<Button variant="contained">Login with Github</Button>
						</a>
						<br />
						<br />
						<a href={account_iri_prefix+'/twitter/'}>
							<Button variant="contained">Login with Twitter</Button>
						</a>
						<br />
						<br />
						<br />
						<Typography variant="body2">
							Wenn du dich anmeldest wird ein Cookie namens "__session" in deinem Broswer gespeichert.
							<br />
							Dieser Cookie bleibt für 14 Tage bestehen. Somit bleibst du 14 Tage lang angemeldet. Immer wenn du die Seite neu aufrufst wird die Zeit bis zum automatischen Löschen des Cookies um 14 Tage verlängert.
						</Typography>
					</Paper>
				</StylesProvider>
				</ThemeProvider>
			)
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


			<Paper
				style={{
					position: 'fixed',
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					overflow: 'auto',
					paddingTop: '48px',
					backgroundColor: this.state.theme.palette.background.default,
				}}
			>
				<AppBar
					position="fixed"
					color="transparent"
					style={{
						borderTopRightRadius: '8px',
						borderTopLeftRadius: '8px',
						overflow: 'hidden',
						backgroundColor: this.state.theme.palette.background.paper,
					}}
				>
					<Tabs
						value={action}
						onChange={this.handleTabChange}
						variant="scrollable"
						scrollButtons="auto"
					>
						<Tab value="" label="Start" />
						<Tab value="changesets" label="Changesets" />
						<Tab value="accounts" label="Accounts" />
						<Tab value="sessions" label="Sessions" />
					</Tabs>
				</AppBar>

				<TabPanel value={action} index="">
					<br />
					<br />
					<br />
					<a href={account_iri_prefix+'/logout/'}>
						<Button variant="contained">Logout</Button>
					</a>
					<br />
					<Typography variant="body2">
						Wenn du dich ausloggst wird der Cookie "__session" von deinem Rechner gelöscht.
						<br />
						(Falls dies nicht passirt, dürfte das ein deinem Browser liegen. Schreib uns aber bitte. Vielleicht haben ja auch wir etwas falsch programmiert. Wird möchten immerhin dass du bei uns sicher bist!)
					</Typography>
				</TabPanel>
				<TabPanel value={action} index="changesets">
					<Typography variant="h4">Changesets</Typography>
					<br />
					<br />
					<br />
					{
						this.state.changesets.map((changeset, index) => {


							return (
								<Card
									key={changeset._id}
									variant="outlined"
									style={{
										marginBottom: '32px',
									}}
								>
									<CardContent>
										<Typography variant="h5" component="h2">
											{changeset.properties.antiSpamUserIdentifier}
										</Typography>

										<div style={{
											paddingTop: '16px',
											overflow: 'auto',
											paddingBottom: '16px',
											margin: '0 -16px',
										}}>
											<Table size="small">
												<TableBody>
													{
														Object.entries({
															...changeset.properties,
															...changeset.metadata,
														})
														.filter(entry =>
															// entry[0] !== 'tags'
															// &&
															entry[0] !== '__typename'
														)
														.map(([tag,value]) => {
															if (tag === 'antiSpamUserIdentifier') {
																tag = 'antiSpamID'
															}

															let cellContent = null
															if (tag === 'tags') {
																cellContent = (
																	<Table
																		className="tagsTable"
																		size="small"
																		style={{
																			minWidth: '100%',
																			margin: '-6px -16px -7px -16px',
																		}}
																	>
																		<TableBody>
																			{Object.entries(changeset.properties.tags).map(([tag,value]) => (
																				<TableRow key={tag} style={{
																					verticalAlign: 'top',
																				}}>
																					<TableCell component="th" scope="row">{tag}</TableCell>
																					<TableCell>{value.toString()}</TableCell>
																				</TableRow>
																			))}
																		</TableBody>
																	</Table>
																)
															} else if (tag === 'forID') {
																cellContent = (
																	<a target="_blank" rel="noopener noreferrer" href={"https://map.qiekub.org/view/"+value+"/"}>
																		<Button
																			 variant="contained"
																			 color="secondary"
																		>{value}</Button>
																	</a>
																)
															}else{
																cellContent = value.toString()
															}

															return (
																<TableRow key={tag} style={{
																	verticalAlign: 'top',
																}}>
																	<TableCell component="th" scope="row">
																		<strong>{tag}</strong>
																	</TableCell>
																	<TableCell align="left">
																		{cellContent}
																	</TableCell>
																</TableRow>
															)
														})
													}
												</TableBody>
											</Table>
										</div>
									</CardContent>
									{/*<CardActions>
										<Button size="small">View </Button>
									</CardActions>*/}
								</Card>
							)
						})
					}
				</TabPanel>
				<TabPanel value={action} index="accounts">
					<Typography variant="h4">Connected Accounts</Typography>
					<br />
					<br />
					<br />
					<List>
					{
						this.state.accounts.map((account, index) => {
							return (
								<ListItem key={account._id}>
									<ListItemText
										primary={account.properties.provider}
										secondary={account.properties.username}
									/>
								</ListItem>
							)
						})
					}
					</List>
				</TabPanel>
				<TabPanel value={action} index="sessions">
					<Typography variant="h4">Sessions</Typography>
					<br />
					<br />
					<br />
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
				</TabPanel>

			</Paper>

		</StylesProvider>
		</ThemeProvider>
		</>)
	}
}

export default withGlobals(withLocalization(App))
