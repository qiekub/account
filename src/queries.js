import {gql} from 'apollo-boost'

export const whoami = gql`
	query {
		whoami
	}
`

export const loadSessions = gql`
	query {
		sessions {
			_id
			properties {
				__typename
				... on Session {
					profileID
					user_agent
					started
					expires
					lastModified
				}
			}
		}
	}
`

export const loadAccounts = gql`
	query {
		accounts {
			_id
			properties {
				__typename
				... on Account {
					provider
					username
				}
			}
		}
	}
`


