const UserModel = require('../models/user.model');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const logger = require('../utils/logger');
const mockDataService = require('../services/mockData.service');

exports.getMe = async (req, res, next) => {
  try {
    const users = await UserModel.getUsersAddress({ address: req.address });
    if (users.length === 0) {
      const { response, statusCode } = notFoundResponse('User not found');
      return res.status(statusCode).json(response);
    }

    const user = users[0];
    const { response, statusCode } = successResponse({
      id: user.id,
      address: user.address,
      token_balance: user.token_balance,
      MBUSD_balance: user.MBUSD_balance,
      referral_code: user.referral_code,
    });

    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Get user error:', error);
    next(error);
  }
};

exports.updateMe = async (_req, res) => {
  const { response, statusCode } = errorResponse('Not implemented', 501);
  return res.status(statusCode).json(response);
};

exports.getUserStatistics = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const req_user_id = req.user_id;

    if (!userId || isNaN(userId) || parseInt(userId) <= 0) {
      const { response, statusCode } = errorResponse('Invalid userId', 400);
      return res.status(statusCode).json(response);
    }

    const parsedUserId = parseInt(userId);
    const authenticatedUser = mockDataService.getUserById(req_user_id)?.[0];
    if (!authenticatedUser) {
      const { response, statusCode } = errorResponse('Unauthorized', 401);
      return res.status(statusCode).json(response);
    }

    const targetUser = mockDataService.getUserById(parsedUserId)?.[0];
    if (!targetUser) {
      const { response, statusCode } = notFoundResponse('User not found');
      return res.status(statusCode).json(response);
    }

    const requesterIsAdmin = authenticatedUser.is_admin === 1;
    
    if (!requesterIsAdmin) {
      if (authenticatedUser.id !== targetUser.id) {
        const { response, statusCode } = errorResponse('Forbidden to query other users', 403);
        return res.status(statusCode).json(response);
      }
    }

    const transactions = mockDataService.getTransactionsByUserId(parsedUserId);
    const totalTransactions = transactions.length;
    const totalTransactionAmount = transactions.reduce((sum, tx) => 
      sum + parseFloat(tx.busd_amount || 0), 0
    );

    const stakings = mockDataService.getStakingByUserId(parsedUserId);
    const totalStaking = stakings.reduce((sum, staking) => 
      sum + parseFloat(staking.busd_amount || 0), 0
    );
    const activeStakings = stakings.filter(s => s.status === 1).length;
    
    const totalRewards = stakings.reduce((sum, staking) => {
      return sum + parseFloat(staking.totalreward || staking.reward_token || 0);
    }, 0);

    const statistics = {
      user: {
        id: targetUser.id,
        address: targetUser.address
      },
      totals: {
        transactions: {
          count: totalTransactions,
          amount: totalTransactionAmount,
        },
        staking: {
          total_staking: totalStaking,
          active_stakings: activeStakings,
          total_rewards: totalRewards,
        }
      }
    };

    const { response, statusCode } = successResponse(statistics);
    return res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Get user statistics error:', error);
    next(error);
  }
};

